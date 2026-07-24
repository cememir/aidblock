/**
 * Sentinel — AI AdBlock | background.js (MV3 service worker)
 *
 * Akış:
 *  1. Bilinen reklam ağları rules_static.json ile anında engellenir (AI'a sorulmaz).
 *  2. Tanınmayan üçüncü taraf alan adları kuyruğa alınır, toplu halde AI'a sorulur.
 *     Sağlayıcı (OpenAI / Gemini / DeepSeek / Claude) ve API anahtarı ayarlar
 *     sayfasından girilir, SADECE chrome.storage.local'da tutulur.
 *  3. Kararlar (block/allow) chrome.storage.local'a 30 gün önbelleklenir.
 *     Aynı alan adı bir daha görüldüğünde AI ÇAĞRILMAZ, doğrudan cache'den okunur.
 *  4. "block" kararı alan alan adları için declarativeNetRequest dinamik kuralı eklenir;
 *     engelleme tarayıcı motorunda, ağ katmanında gerçekleşir.
 */

// ---------------------------------------------------------------- sabitler

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // karar önbelleği: 30 gün
const COSMETIC_TTL_MS = 7 * 24 * 60 * 60 * 1000; // sayfa seçici önbelleği: 7 gün
const COSMETIC_EMPTY_TTL_MS = 6 * 60 * 60 * 1000; // boş sonuç: 6 saat sonra tekrar dene
const BATCH_SIZE = 15;          // bu kadar bilinmeyen domain birikince hemen sor
const FLUSH_ALARM = "sentinel-flush";
const RULE_ID_START = 10000;    // dinamik kural id'leri statiklerle çakışmasın

// Asla engellenmemesi gereken alan adları (yanlış pozitif sigortası).
// Buradaki domainler AI tarafından "block" sayılsa bile engellenmez;
// mevcut hatalı kararlar purgeProtectedDomains() ile temizlenir.
const NEVER_BLOCK = new Set([
  // CDN / altyapı
  "googleapis.com", "gstatic.com", "cloudflare.com", "cloudfront.net",
  "jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "akamaized.net",
  "akamaihd.net", "fastly.net", "github.io", "githubusercontent.com",
  "recaptcha.net", "amazonaws.com", "windows.net", "gvt1.com", "gvt2.com",
  // Google servisleri
  "google.com", "googleusercontent.com", "ggpht.com",
  "youtube.com", "ytimg.com", "googlevideo.com",
  // Meta servisleri (pikselleri iframe/istek olarak görülüp yanlışlıkla
  // engellenirse business.facebook.com gibi birinci taraf uygulamalar kırılır)
  "facebook.com", "fbcdn.net", "fbsbx.com", "instagram.com",
  "whatsapp.com", "whatsapp.net", "messenger.com",
  // Diğer büyük platformlar
  "twitter.com", "x.com", "twimg.com", "linkedin.com", "licdn.com",
  "microsoft.com", "live.com", "office.com", "apple.com", "icloud.com",
  "tiktokcdn.com", "paypal.com", "stripe.com", "gravatar.com", "wp.com",
]);

// Bu sitelerde AI kozmetik filtresi ÇALIŞMAZ (video oynatıcı / webapp arayüzü
// yanlışlıkla gizlenmesin). Genel seçiciler content.js'te yine uygulanır.
const NO_COSMETIC = [
  "youtube.com", "twitch.tv", "netflix.com", "vimeo.com", "primevideo.com",
  "disneyplus.com", "spotify.com", "facebook.com", "messenger.com",
  "instagram.com", "whatsapp.com", "mail.google.com", "docs.google.com",
  "drive.google.com", "figma.com", "canva.com",
];

function isNoCosmeticHost(hostname) {
  return NO_COSMETIC.some((d) => hostname === d || hostname.endsWith("." + d));
}

// ---------------------------------------------------------------- AI sağlayıcıları

/**
 * Her sağlayıcı: call(key, prompt) → ham metin (JSON bekliyoruz).
 * Anahtar hiçbir zaman bu dosyanın dışına çıkmaz; sadece ilgili sağlayıcının
 * resmi API adresine HTTPS ile gönderilir.
 */
const PROVIDERS = {
  openai: {
    label: "OpenAI",
    model: "gpt-4o-mini",
    async call(key, prompt) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
      const data = await res.json();
      return data.choices[0].message.content;
    },
  },

  gemini: {
    label: "Google Gemini",
    model: "gemini-2.5-flash",
    async call(key, prompt) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, responseMimeType: "application/json" },
          }),
        }
      );
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
      const data = await res.json();
      return data.candidates[0].content.parts[0].text;
    },
  },

  deepseek: {
    label: "DeepSeek",
    model: "deepseek-chat",
    async call(key, prompt) {
      const res = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}`);
      const data = await res.json();
      return data.choices[0].message.content;
    },
  },

  claude: {
    label: "Anthropic Claude",
    model: "claude-haiku-4-5",
    async call(key, prompt) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
      const data = await res.json();
      if (data.stop_reason === "refusal") throw new Error("Claude refusal");
      const block = data.content.find((b) => b.type === "text");
      return block ? block.text : "";
    },
  },
};

// ---------------------------------------------------------------- durum

const pendingDomains = new Set();  // AI'a sorulmayı bekleyenler
const inFlight = new Set();        // şu an sorulmakta olanlar (çift sorguyu önler)
let flushTimer = null;

// ---------------------------------------------------------------- yardımcılar

/** URL'den kayıtlı alan adını (eTLD+1 yaklaşımı) çıkarır. */
function registrableDomain(url) {
  try {
    const host = new URL(url).hostname;
    if (!host || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null; // IP'leri atla
    const parts = host.split(".");
    if (parts.length <= 2) return host;
    // com.tr, co.uk gibi iki parçalı TLD'ler için kaba ama pratik kontrol
    const twoPartTld = /^(com|net|org|gov|edu|co|gen|web|av|bel|biz|info|k12|pol|tel|tsk|tv|bbs|name|mil)\.(tr|uk|jp|au|br|in|za|nz|mx|kr|id)$/;
    const lastTwo = parts.slice(-2).join(".");
    return twoPartTld.test(lastTwo) ? parts.slice(-3).join(".") : lastTwo;
  } catch { return null; }
}

async function getLocal(keys) { return chrome.storage.local.get(keys); }
async function setLocal(obj)  { return chrome.storage.local.set(obj); }

async function isEnabled() {
  const { enabled = true } = await getLocal("enabled");
  return enabled;
}

/** Aktif sağlayıcı + o sağlayıcı için kayıtlı anahtar. Anahtar sadece localde. */
async function getAISettings() {
  const { aiProvider = "openai", aiKeys = {} } = await getLocal(["aiProvider", "aiKeys"]);
  const provider = PROVIDERS[aiProvider] ? aiProvider : "openai";
  return { provider, key: aiKeys[provider] || null };
}

/** ```json ... ``` gibi çitleri temizleyip JSON parse eder. */
function parseJSONLoose(text) {
  const t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(t);
}

/** Aktif sağlayıcı ile prompt çalıştırır, parse edilmiş JSON döner. Anahtar yoksa null. */
async function callLLM(prompt) {
  const { provider, key } = await getAISettings();
  if (!key) {
    console.warn("[Sentinel] API anahtarı yok — ayarlar sayfasından girin.");
    return null;
  }
  const raw = await PROVIDERS[provider].call(key, prompt);
  return parseJSONLoose(raw);
}

// ---------------------------------------------------------------- önbellek

/** Alan adının kararını cache'den okur. Süresi dolmuşsa null döner. */
async function cachedVerdict(domain) {
  const { verdictCache = {} } = await getLocal("verdictCache");
  const entry = verdictCache[domain];
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return null; // süresi dolmuş
  return entry.v; // "block" | "allow"
}

async function saveVerdicts(map) {
  const { verdictCache = {} } = await getLocal("verdictCache");
  const now = Date.now();
  for (const [d, v] of Object.entries(map)) verdictCache[d] = { v, ts: now };
  await setLocal({ verdictCache });
}

// ---------------------------------------------------------------- dinamik kurallar

async function addBlockRules(domains) {
  if (!domains.length) return;
  const store = await getLocal(["ruleMap", "nextRuleId"]);
  const ruleMap = store.ruleMap || {};
  let nextId = store.nextRuleId || RULE_ID_START;

  const newRules = [];
  for (const d of domains) {
    if (ruleMap[d]) continue; // zaten kuralı var
    const id = nextId++;
    ruleMap[d] = id;
    newRules.push({
      id,
      priority: 2,
      action: { type: "block" },
      condition: {
        urlFilter: `||${d}^`,
        // SADECE üçüncü taraf istekleri kes: bir domain başka sitelerde
        // izleyici olsa bile kendi sitesi (örn. business.facebook.com'da
        // facebook.com istekleri) asla kırılmaz.
        domainType: "thirdParty",
        // Ana sayfa gezinmesini asla engelleme; sadece alt kaynakları kes
        resourceTypes: ["script", "image", "sub_frame", "xmlhttprequest", "ping", "media", "font", "websocket", "other"],
      },
    });
  }
  if (!newRules.length) return;

  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: newRules });
  await setLocal({ ruleMap, nextRuleId: nextId });
  console.log("[Sentinel] Yeni engel kuralları:", domains.join(", "));
}

async function removeAllDynamicRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  if (rules.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map(r => r.id),
    });
  }
}

/**
 * NEVER_BLOCK listesine sonradan eklenen domainler için geçmişte verilmiş
 * hatalı "block" kararlarını ve kurallarını temizler (migrasyon sigortası).
 */
async function purgeProtectedDomains() {
  const { verdictCache = {}, ruleMap = {} } = await getLocal(["verdictCache", "ruleMap"]);
  const removeIds = [];
  let changed = false;
  for (const d of Object.keys(verdictCache)) {
    if (NEVER_BLOCK.has(d)) { delete verdictCache[d]; changed = true; }
  }
  for (const [d, id] of Object.entries(ruleMap)) {
    if (NEVER_BLOCK.has(d)) { removeIds.push(id); delete ruleMap[d]; changed = true; }
  }
  if (removeIds.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
  }
  if (changed) {
    await setLocal({ verdictCache, ruleMap });
    console.log("[Sentinel] Korunan domain kararları temizlendi:", removeIds.length);
  }
}

/** Toggle açıldığında cache'teki tüm block kararlarını kurallara geri yükler. */
async function rebuildRulesFromCache() {
  const { verdictCache = {} } = await getLocal("verdictCache");
  await setLocal({ ruleMap: {}, nextRuleId: RULE_ID_START });
  const blocked = Object.entries(verdictCache)
    .filter(([, e]) => e.v === "block" && Date.now() - e.ts <= CACHE_TTL_MS)
    .map(([d]) => d);
  await addBlockRules(blocked);
}

// ---------------------------------------------------------------- AI sınıflandırma

/**
 * Bilinmeyen alan adlarını tek istekle sınıflandırır.
 * Dönen değer: { "domain.com": "block" | "allow", ... }
 */
async function classifyDomains(domains) {
  const prompt = `You are an ad/tracker classifier for a browser ad blocker.
For each domain decide "block" if it is primarily an advertising, tracking,
analytics, fingerprinting or ad-tech domain, otherwise "allow".
Be conservative: CDNs, APIs, login/auth, payment and general content domains are "allow".
Respond ONLY with a JSON object: {"verdicts": {"domain": "block"|"allow", ...}}.

Domains:
${domains.join("\n")}`;

  try {
    const parsed = await callLLM(prompt);
    if (!parsed) return {};
    const out = {};
    for (const d of domains) {
      let v = parsed.verdicts?.[d];
      if (v !== "block" && v !== "allow") v = "allow"; // belirsizse engelleme
      if (NEVER_BLOCK.has(d)) v = "allow";             // sigorta
      out[d] = v;
    }
    return out;
  } catch (e) {
    console.warn("[Sentinel] Sınıflandırma hatası:", e);
    return {}; // hata olursa cache'e yazma; bir dahaki sefere tekrar denenir
  }
}

/** Kuyruğu boşaltır: AI'a sorar, cache'e yazar, kuralları ekler. */
async function flushQueue() {
  if (!(await isEnabled())) return;
  const batch = [...pendingDomains].filter(d => !inFlight.has(d)).slice(0, BATCH_SIZE * 2);
  if (!batch.length) return;
  batch.forEach(d => { pendingDomains.delete(d); inFlight.add(d); });

  try {
    const verdicts = await classifyDomains(batch);
    if (Object.keys(verdicts).length) {
      await saveVerdicts(verdicts);
      await addBlockRules(Object.entries(verdicts).filter(([, v]) => v === "block").map(([d]) => d));
      // İstatistik: AI'ın öğrendiği toplam domain
      const { stats = {} } = await getLocal("stats");
      stats.learned = (stats.learned || 0) + Object.keys(verdicts).length;
      await setLocal({ stats });
    }
  } finally {
    batch.forEach(d => inFlight.delete(d));
  }
}

function scheduleFlush() {
  if (pendingDomains.size >= BATCH_SIZE) { flushQueue(); return; }
  if (flushTimer) return;
  flushTimer = setTimeout(() => { flushTimer = null; flushQueue(); }, 4000);
}

// ---------------------------------------------------------------- istek gözlemi

// Gözlemsel dinleyici (MV3'te engelleme yapamaz; sadece bilinmeyenleri toplar)
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (details.type === "main_frame") return;
    if (!(await isEnabled())) return;

    const reqDomain = registrableDomain(details.url);
    const pageDomain = registrableDomain(details.initiator || details.documentUrl || "");
    if (!reqDomain || reqDomain === pageDomain) return;   // birinci taraf → ilgilenme
    if (NEVER_BLOCK.has(reqDomain)) return;
    if (pendingDomains.has(reqDomain) || inFlight.has(reqDomain)) return;

    // ÖNBELLEK KONTROLÜ — daha önce karar verildiyse AI'a hiç gitme
    const verdict = await cachedVerdict(reqDomain);
    if (verdict !== null) return; // block ise kural zaten aktif, allow ise dokunma

    pendingDomains.add(reqDomain);
    scheduleFlush();
  },
  { urls: ["<all_urls>"] }
);

// Engellenen istekleri say (tarayıcı ERR_BLOCKED_BY_CLIENT üretir)
chrome.webRequest.onErrorOccurred.addListener(
  async (details) => {
    if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
    const { stats = {} } = await getLocal("stats");
    const today = new Date().toDateString();
    if (stats.day !== today) { stats.day = today; stats.blockedToday = 0; }
    stats.blockedToday = (stats.blockedToday || 0) + 1;
    stats.blockedTotal = (stats.blockedTotal || 0) + 1;
    await setLocal({ stats });
  },
  { urls: ["<all_urls>"] }
);

// ---------------------------------------------------------------- kozmetik filtre (AI)

/**
 * Content script'in gönderdiği şüpheli element örneklerinden, sayfada gizlenecek
 * CSS seçicilerini üretir. Sonuç hostname bazında önbelleklenir.
 */
/** Boş sonuçlar daha kısa süre önbellekte kalır (site sonradan reklam gösterebilir). */
function cosmeticFresh(hit) {
  if (!hit) return false;
  const ttl = hit.selectors?.length ? COSMETIC_TTL_MS : COSMETIC_EMPTY_TTL_MS;
  return Date.now() - hit.ts < ttl;
}

/** AI seçicilerinde yasak kalıplar: çıplak tag, body/html/*, medya elementleri. */
const SEL_BARE_TAG = /^[a-z][a-z0-9]*$/i;
const SEL_FORBIDDEN = /(^|[\s>~+])(body|html|\*)([\s>~+]|$)|video|audio/i;

function sanitizeSelectors(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(
    raw
      .filter((s) => typeof s === "string")
      .map((s) => s.trim())
      .filter((s) => s && s.length < 200 && !SEL_BARE_TAG.test(s) && !SEL_FORBIDDEN.test(s))
  )].slice(0, 20);
}

/**
 * Sayfanın sadeleştirilmiş HTML'ini AI'a gönderir; AI reklam kapsayıcıları
 * için class/id tabanlı CSS seçicileri döndürür. Seçiciler burada sözdizimsel
 * süzgeçten, content script'te ise çalışma anı güvenlik testinden geçer.
 * Sonuç hostname bazında önbelleklenir.
 */
async function classifyHTML(hostname, html) {
  if (isNoCosmeticHost(hostname)) {
    return { selectors: [], debug: "kozmetik-kapali-site" }; // video/webapp siteleri
  }

  const { cosmetic = {} } = await getLocal("cosmetic");
  const hit = cosmetic[hostname];
  if (cosmeticFresh(hit)) return { selectors: hit.selectors, debug: "cache" };

  if (!html || html.length < 200) return { selectors: [], debug: "html-yok" };

  const prompt = `You are an ad-detection assistant for a browser ad blocker's cosmetic filtering.
Below is the simplified HTML of "${hostname}" (scripts/styles stripped, text truncated).
Find every element that is an advertisement, sponsored content or promo banner, and
return CSS selectors that hide their OUTERMOST container (including wrapper, background
strip and close button).

Selector rules — follow strictly:
- Use class/id/attribute selectors that literally exist in this HTML,
  e.g. ".threadSponsor", "section.topbar", "div[data-cname]", ".some-random-class".
- NEVER use bare tag selectors (div, a, img, section...), never "body", "html", "*",
  and never :nth-child paths.
- Prefer one selector that covers all instances of the same ad slot class.
- Do NOT target: navigation, logo, search, login/register, forum thread lists,
  article content, comments, the whole footer, cookie notices.
- Maximum 20 selectors. If unsure about an element, leave it out.

Ad signals: visible labels ("Reklam", "Sponsorlu", "Sponsored", "Advertisement");
links with rel="nofollow"/"sponsored" wrapping banner images; 728x90 / 300x250-like
banner images; top notification bars promoting products; classes containing
ad/banner/sponsor/topbar/promo/reklam; randomized/obfuscated class names wrapping
external marketing links; iframes from ad networks.

Respond ONLY as JSON: {"selectors": ["...", "..."]}

HTML:
${html.slice(0, 45000)}`;

  try {
    const parsed = await callLLM(prompt);
    if (!parsed) return { selectors: [], debug: "anahtar-yok" };

    const raw = parsed.selectors ?? parsed.hide ?? parsed.ads;
    if (!Array.isArray(raw)) {
      // Beklenen alan yok → model formata uymadı; CACHE'LEME, sonraki sayfada tekrar dene
      return { selectors: [], debug: "selectors-alani-yok: " + JSON.stringify(parsed).slice(0, 300) };
    }
    const selectors = sanitizeSelectors(raw);
    cosmetic[hostname] = { selectors, ts: Date.now() };
    await setLocal({ cosmetic });
    return { selectors, debug: `ai-ham=${raw.length} süzülmüş=${selectors.length}` };
  } catch (e) {
    console.warn("[Sentinel] Kozmetik sınıflandırma hatası:", e);
    return { selectors: [], debug: "hata: " + String(e && e.message || e) };
  }
}

// ---------------------------------------------------------------- topluluk kuralları

/**
 * Topluluk katmanı: kullanıcı sağ tıkla bir reklamı engellediğinde kural
 * (yalnızca hostname + CSS seçici — başka hiçbir veri yok) opsiyonel topluluk
 * API'sine raporlanır. Diğer kullanıcılarda net puanı eşiği geçen kurallar
 * otomatik uygulanır; düşük puanlılar sayfada oy sorusu olarak gösterilir.
 * API adresi ayarlardan girilir; boşsa özellik tamamen kapalıdır.
 */
const COMMUNITY_TTL_MS = 12 * 60 * 60 * 1000; // kural listesi önbelleği
const COMMUNITY_APPROVE_SCORE = 3;            // bu puan ve üstü otomatik uygulanır

async function getCommunityCfg() {
  const { communityApi = "", communityShare = true } = await getLocal(["communityApi", "communityShare"]);
  return { api: String(communityApi).trim().replace(/\/+$/, ""), share: !!communityShare };
}

async function communityPost(path, body) {
  const { api, share } = await getCommunityCfg();
  if (!api || !share) return false;
  try {
    const res = await fetch(api + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.warn("[Sentinel] topluluk API erişilemedi:", e);
    return false;
  }
}

async function communityRules(hostname) {
  const { api } = await getCommunityCfg();
  if (!api) return null;
  const { communityCache = {} } = await getLocal("communityCache");
  const hit = communityCache[hostname];
  if (hit && Date.now() - hit.ts < COMMUNITY_TTL_MS) return hit.data;
  try {
    const res = await fetch(`${api}/rules/${encodeURIComponent(hostname)}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const list = await res.json(); // [{selector, score}]
    const rows = Array.isArray(list) ? list.filter(r => typeof r?.selector === "string" && r.selector.length < 300) : [];
    const data = {
      approved: rows.filter(r => (r.score | 0) >= COMMUNITY_APPROVE_SCORE).map(r => r.selector).slice(0, 25),
      pending: rows.filter(r => (r.score | 0) < COMMUNITY_APPROVE_SCORE)
        .map(r => ({ selector: r.selector, score: r.score | 0 })).slice(0, 10),
    };
    communityCache[hostname] = { data, ts: Date.now() };
    await setLocal({ communityCache });
    return data;
  } catch (e) {
    console.warn("[Sentinel] topluluk kuralları alınamadı:", e);
    return hit?.data || null;
  }
}

/** Kullanıcının kendi sağ-tık kuralını kaydeder ve topluluğa raporlar. */
async function saveUserRule(hostname, selector) {
  const { userCosmetic = {} } = await getLocal("userCosmetic");
  const list = userCosmetic[hostname] || [];
  if (!list.includes(selector)) {
    list.push(selector);
    userCosmetic[hostname] = list.slice(-40);
    await setLocal({ userCosmetic });
  }
  communityPost("/report", { host: hostname, selector }); // arka planda, beklenmez
}

/** Aynı kurala tekrar oy sorulmasın diye yerel oy kaydı tutulur. */
async function recordVote(hostname, selector, vote) {
  const { communityVoted = {} } = await getLocal("communityVoted");
  (communityVoted[hostname] ||= {})[selector] = vote;
  await setLocal({ communityVoted });
  await communityPost("/vote", { host: hostname, selector, vote });
}

// ---------------------------------------------------------------- sağ tık menüsü

function setupContextMenu() {
  chrome.contextMenus.create(
    {
      id: "sentinel-block-element",
      title: chrome.i18n.getMessage("ctxBlock"),
      contexts: ["all"],
    },
    () => void chrome.runtime.lastError // "duplicate id" hatasını yut
  );
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "sentinel-block-element" && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "CONTEXT_BLOCK" }).catch(() => {});
  }
});

// ---------------------------------------------------------------- mesajlaşma

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg.type) {
      case "GET_STATS": {
        const { stats = {}, verdictCache = {}, enabled = true } = await getLocal(["stats", "verdictCache", "enabled"]);
        const { provider, key } = await getAISettings();
        const blockedDomains = Object.values(verdictCache).filter(e => e.v === "block").length;
        sendResponse({
          stats,
          cachedDomains: Object.keys(verdictCache).length,
          blockedDomains,
          enabled,
          hasKey: !!key,
          provider: PROVIDERS[provider].label,
        });
        break;
      }
      case "TOGGLE": {
        const enabled = !!msg.value;
        await setLocal({ enabled });
        await chrome.declarativeNetRequest.updateEnabledRulesets(
          enabled ? { enableRulesetIds: ["baseline"] } : { disableRulesetIds: ["baseline"] }
        );
        if (enabled) await rebuildRulesFromCache();
        else await removeAllDynamicRules();
        sendResponse({ ok: true, enabled });
        break;
      }
      case "CLEAR_CACHE": {
        await removeAllDynamicRules();
        await setLocal({ verdictCache: {}, cosmetic: {}, ruleMap: {}, nextRuleId: RULE_ID_START });
        sendResponse({ ok: true });
        break;
      }
      case "TEST_KEY": {
        // Ayarlar sayfasındaki "Test et" butonu: anahtar gerçekten çalışıyor mu?
        try {
          const p = PROVIDERS[msg.provider];
          if (!p || !msg.key) { sendResponse({ ok: false, error: "invalid" }); break; }
          const raw = await p.call(msg.key, 'Reply ONLY with this exact JSON: {"ok":true}');
          const parsed = parseJSONLoose(raw);
          sendResponse({ ok: parsed.ok === true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e && e.message || e) });
        }
        break;
      }
      case "GET_COSMETIC": {
        if (!(await isEnabled())) {
          sendResponse({ selectors: [], cached: true, userSelectors: [], community: null });
          break;
        }
        const { cosmetic = {}, userCosmetic = {}, communityVoted = {} } =
          await getLocal(["cosmetic", "userCosmetic", "communityVoted"]);
        if (isNoCosmeticHost(msg.hostname)) {
          // AI/topluluk kozmetiği kapalı; kullanıcının KENDİ sağ tık kuralları
          // yine de uygulanır (bilinçli tercih)
          sendResponse({ selectors: [], cached: true, userSelectors: userCosmetic[msg.hostname] || [], community: null });
          break;
        }
        const hit = cosmetic[msg.hostname];
        const fresh = cosmeticFresh(hit);

        // Topluluk kuralları: oyu verilmiş "beklemede" kuralları tekrar sorma
        let community = await communityRules(msg.hostname);
        if (community) {
          const voted = communityVoted[msg.hostname] || {};
          community = {
            approved: community.approved,
            pending: community.pending.filter(p => !(p.selector in voted)),
          };
        }
        sendResponse({
          selectors: fresh ? hit.selectors : null,
          cached: fresh,
          userSelectors: userCosmetic[msg.hostname] || [],
          community,
        });
        break;
      }
      case "SAVE_USER_RULE": {
        // Sağ tık → "reklamı engelle": kural yerel kaydedilir + topluluğa raporlanır
        if (typeof msg.selector === "string" && msg.selector.length < 300) {
          await saveUserRule(msg.hostname, msg.selector);
        }
        sendResponse({ ok: true });
        break;
      }
      case "COMMUNITY_VOTE": {
        // Beklemedeki topluluk kuralı için kullanıcı oyu (+1 reklam / -1 değil)
        const vote = msg.vote > 0 ? 1 : -1;
        await recordVote(msg.hostname, msg.selector, vote);
        sendResponse({ ok: true });
        break;
      }
      case "CLASSIFY_HTML": {
        const r = await classifyHTML(msg.hostname, msg.html);
        sendResponse({ selectors: r.selectors, debug: r.debug });
        break;
      }
      case "RESCAN_HOST": {
        // Popup'taki "Bu siteyi yeniden tara": sitenin kozmetik önbelleğini sil
        const { cosmetic = {} } = await getLocal("cosmetic");
        delete cosmetic[msg.hostname];
        await setLocal({ cosmetic });
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({});
    }
  })();
  return true; // async cevap
});

// ---------------------------------------------------------------- yaşam döngüsü

chrome.runtime.onInstalled.addListener(async (details) => {
  await setLocal({ enabled: true });
  chrome.alarms.create(FLUSH_ALARM, { periodInMinutes: 1 }); // SW uyusa da kuyruk boşalır
  setupContextMenu();

  // Migrasyon: hatalı block kararlarını sil, kozmetik önbelleği sıfırla ve
  // tüm dinamik kuralları yeni şemayla (domainType: thirdParty) yeniden kur
  await purgeProtectedDomains();
  if (details.reason === "update") {
    await setLocal({ cosmetic: {} }); // eski (guard'sız) AI seçicilerini at
    await removeAllDynamicRules();
    if (await isEnabled()) await rebuildRulesFromCache();
  }

  // İlk kurulumda anahtar yoksa kullanıcıyı doğrudan ayarlar sayfasına götür
  if (details.reason === "install") {
    const { key } = await getAISettings();
    if (!key) chrome.runtime.openOptionsPage();
  }
});

chrome.alarms.onAlarm.addListener((a) => { if (a.name === FLUSH_ALARM) flushQueue(); });
