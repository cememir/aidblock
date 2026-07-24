/**
 * Sentinel — content.js
 * Ağ katmanında engellenemeyen sayfa-içi reklam kutularını gizler.
 * 1. Genel (evrensel) seçiciler her sayfada anında uygulanır.
 * 2. Bu siteye özel seçiciler önce ÖNBELLEKTEN istenir.
 * 3. Cache boşsa, sayfadaki şüpheli elementler örneklenip AI'a bir kez gönderilir;
 *    dönen seçiciler 7 gün cache'lenir — aynı siteye tekrar girildiğinde AI çağrılmaz.
 */

(() => {
  const HOST = location.hostname.replace(/^www\./, "");

  // Her sitede güvenle uygulanabilen genel seçiciler
  const GENERIC = [
    'iframe[src*="doubleclick"]', 'iframe[src*="adsystem"]', 'iframe[id^="google_ads_"]',
    'ins.adsbygoogle', '[id^="div-gpt-ad"]', '[data-ad-slot]', '[data-ad-client]',
    '.ad-banner', '.ad-container', '.advertisement', '#taboola-below-article-thumbnails',
    '.OUTBRAIN', '[class*="sponsored-content"]',
  ];

  function injectCSS(selectors) {
    if (!selectors.length) return;
    const style = document.createElement("style");
    style.dataset.sentinel = "1";
    style.textContent = selectors.join(",\n") + " { display: none !important; }";
    (document.head || document.documentElement).appendChild(style);
  }

  /**
   * AI seçicileri için güvenlik testi: sayfa içeriğini (video oynatıcı,
   * ana düzen) gizleyebilecek seçiciler UYGULANMAZ.
   *  - geçersiz seçici → reddet
   *  - 15'ten fazla element yakalıyorsa → fazla genel, reddet
   *  - yakaladığı element video/audio içeriyorsa veya kendisi video ise → reddet
   *  - element görünür alanın %40'ından fazlasını kaplıyorsa → reddet
   */
  function safeSelectors(selectors) {
    const maxArea = innerWidth * innerHeight * 0.4;
    return selectors.filter((sel) => {
      let nodes;
      try { nodes = document.querySelectorAll(sel); } catch { return false; }
      if (nodes.length > 15) return false;
      for (const el of nodes) {
        if (el.tagName === "VIDEO" || el.tagName === "AUDIO") return false;
        if (el.querySelector("video, audio")) return false;
        const r = el.getBoundingClientRect();
        if (r.width * r.height > maxArea) return false;
      }
      return true;
    });
  }

  injectCSS(GENERIC);

  function hostOf(url) {
    try { return new URL(url, location.href).hostname; } catch { return undefined; }
  }

  // class/id token'ı reklamla ilişkili mi? (kelime sınırlı — "header"/"thread"
  // gibi içinde "ad" geçen masum isimler eşleşmez)
  const AD_TOKEN = /(?:^|[-_])(ads?|advert\w*|adsense|adslot|banner\w*|sponsor\w*|promo(?:ted|tion)?\w*|reklam\w*)(?:[-_]|$)/i;

  function looksAdNamed(el) {
    const cls = typeof el.className === "string" ? el.className : "";
    const tokens = (cls + " " + (el.id || "")).split(/\s+/);
    return tokens.some((t) => t && AD_TOKEN.test(t));
  }

  /**
   * AI'a göndermek için şüpheli element örnekleri toplar (küçük, anonim özet).
   * Öncelik sırası: (1) dış siteye link veren banner boyutlu görseller —
   * sitelerin kendi sunucusundan servis ettiği class'sız sponsor banner'ları
   * ancak böyle yakalanır — (2) reklam isimli class/id taşıyanlar, (3) iframe'ler.
   * href/txt/x/y alanları AI'a bağlam verir.
   */
  function sampleSuspects() {
    const suspects = [];
    const seen = new Set();

    function push(el) {
      if (!el || suspects.length >= 30 || seen.has(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 50 || r.height < 40) return; // görünmez/ufak şeyleri atla
      seen.add(el);
      const a = el.closest("a[href]") || (el.querySelector ? el.querySelector("a[href]") : null);
      const linkHost = a ? hostOf(a.href) : undefined;
      suspects.push({
        tag: el.tagName.toLowerCase(),
        id: el.id?.slice(0, 60) || undefined,
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 120) || undefined,
        src: el.src ? hostOf(el.src) : undefined,
        href: linkHost && linkHost !== HOST ? linkHost : undefined, // dış bağlantı hedefi
        txt: (el.innerText || el.alt || "").trim().replace(/\s+/g, " ").slice(0, 80) || undefined,
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.left), y: Math.round(r.top + scrollY), // sayfadaki konum
      });
    }

    // 1) EN ÖNCELİKLİ: dış siteye link veren banner boyutlu görseller
    document.querySelectorAll("a[href] img").forEach((img) => {
      const a = img.closest("a[href]");
      const host = a ? hostOf(a.href) : null;
      if (!host || host === HOST) return;
      const r = img.getBoundingClientRect();
      if (r.width >= 150 && r.height >= 40) push(a);
    });

    // 2) Reklam isimli class/id taşıyan elementler (kelime sınırlı eşleşme)
    for (const el of document.querySelectorAll("[class], [id]")) {
      if (suspects.length >= 30) break;
      if (looksAdNamed(el)) push(el);
    }

    // 3) Boyutlu iframe'ler
    document.querySelectorAll("iframe").forEach(push);

    return suspects;
  }

  async function run() {
    // 1) Önce cache'e bak (cache'ten gelse bile güvenlik testinden geçir)
    const res = await chrome.runtime.sendMessage({ type: "GET_COSMETIC", hostname: HOST });
    if (res?.selectors) {
      const safe = safeSelectors(res.selectors);
      console.info("[Sentinel] kozmetik (cache):", res.selectors.length, "seçici,", safe.length, "uygulandı");
      injectCSS(safe);
      return; // cache HIT → AI yok
    }

    // 2) Cache boş → sayfa otursun, örnekle, AI'a bir kez sor
    setTimeout(async () => {
      const samples = sampleSuspects();
      console.info("[Sentinel] kozmetik: AI'a gönderilen örnek sayısı =", samples.length);
      if (!samples.length) return;
      const out = await chrome.runtime.sendMessage({
        type: "CLASSIFY_ELEMENTS", hostname: HOST, samples,
      });
      const safe = safeSelectors(out?.selectors || []);
      console.info("[Sentinel] kozmetik: AI seçicileri =", out?.selectors, "| uygulanan =", safe);
      if (safe.length) injectCSS(safe);
    }, 2500);
  }

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
