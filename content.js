/**
 * Sentinel — content.js
 * Ağ katmanında engellenemeyen sayfa-içi reklam kutularını gizler.
 * 1. Genel (evrensel) seçiciler her sayfada anında uygulanır.
 * 2. Bu siteye özel seçiciler önce ÖNBELLEKTEN istenir.
 * 3. Cache boşsa, sayfadaki şüpheli elementler numaralanıp AI'a gönderilir;
 *    AI yalnızca hangi İNDEKSLERİN reklam olduğunu söyler — CSS hedeflemesini
 *    biz üretiriz (kararlı :nth-child yolları). Sonuç 7 gün cache'lenir.
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

  function hostOf(url) {
    try { return new URL(url, location.href).hostname; } catch { return undefined; }
  }

  /** Element için kararlı, tekil CSS yolu üretir (id varsa kısalır). */
  function cssPath(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 7) {
      let sel = node.tagName.toLowerCase();
      const p = node.parentElement;
      if (!p) break;
      const idx = Array.prototype.indexOf.call(p.children, node) + 1;
      parts.unshift(`${sel}:nth-child(${idx})`);
      if (p.id) { parts.unshift(`#${CSS.escape(p.id)}`); return parts.join(" > "); }
      node = p;
    }
    parts.unshift("body");
    return parts.join(" > ");
  }

  // class/id token'ı reklamla ilişkili mi? (kelime sınırlı — "header"/"thread"
  // gibi içinde "ad" geçen masum isimler eşleşmez)
  const AD_TOKEN = /(?:^|[-_])(ads?|advert\w*|adsense|adslot|banner\w*|sponsor\w*|promo(?:ted|tion)?\w*|reklam\w*)(?:[-_]|$)/i;

  function looksAdNamed(el) {
    const cls = typeof el.className === "string" ? el.className : "";
    const tokens = (cls + " " + (el.id || "")).split(/\s+/);
    return tokens.some((t) => t && AD_TOKEN.test(t));
  }

  /** Liste elemanı mı? (forum konu satırları gibi tekrar eden kardeşler → reklam değil) */
  function isRepeatedListItem(el) {
    const p = el.parentElement;
    if (!p) return false;
    let same = 0;
    for (const sib of p.children) {
      if (sib.tagName === el.tagName && sib.className === el.className) same++;
      if (same > 4) return true;
    }
    return false;
  }

  /**
   * Şüpheli elementleri toplar; her örneğe indeks (i) ve kararlı CSS yolu (sel)
   * eklenir. AI yalnızca indeks döndürür — hedefleme bizde kalır.
   * Kaynaklar:
   *  1. Görsel/arka plan içeren linkler (site içi yönlendirme linkleri DAHİL —
   *     forumlar reklam tıklamalarını kendi domaininden geçirir)
   *  2. Banner geometrili bloklar: tam genişlik ince barlar, yan sütun kutuları
   *  3. Reklam isimli class/id taşıyanlar, iframe'ler
   */
  function sampleSuspects() {
    const samples = [];
    const seen = new Set();
    const vw = innerWidth;

    function push(el, bg = false) {
      if (!el || samples.length >= 30 || seen.has(el) || isRepeatedListItem(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width < 50 || r.height < 30) return;
      if (r.width * r.height > innerWidth * innerHeight * 0.5) return; // dev sarmalayıcıları alma
      seen.add(el);
      const a = el.closest("a[href]") || (el.querySelector ? el.querySelector("a[href]") : null);
      let href;
      try { href = a ? new URL(a.href, location.href).href.slice(0, 100) : undefined; } catch {}
      samples.push({
        i: samples.length,
        sel: cssPath(el),
        tag: el.tagName.toLowerCase(),
        id: el.id?.slice(0, 60) || undefined,
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 100) || undefined,
        src: el.src ? hostOf(el.src) : undefined,
        href,
        bg: bg || undefined,
        txt: (el.innerText || el.alt || "").trim().replace(/\s+/g, " ").slice(0, 90) || undefined,
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.left), y: Math.round(r.top + scrollY),
      });
    }

    // 1) Görsel içeren linkler (iç/dış fark etmez — yönlendirme linkleri de reklam olabilir)
    document.querySelectorAll("a[href] img").forEach((img) => {
      const r = img.getBoundingClientRect();
      if (r.width >= 120 && r.height >= 40) push(img.closest("a[href]"));
    });

    // 2) Arka plan görselli linkler / banner geometrili bloklar
    document.querySelectorAll("a[href], div, section, aside").forEach((el) => {
      if (samples.length >= 30) return;
      const r = el.getBoundingClientRect();
      const fullBar = r.width >= vw * 0.55 && r.height >= 30 && r.height <= 140; // üst şerit
      const sideBox = r.width >= 150 && r.width <= 420 && r.height >= 200 && r.height <= 650; // yan kutu
      if (!fullBar && !sideBox) return;
      const style = getComputedStyle(el);
      const hasBg = style.backgroundImage !== "none";
      const isLink = el.tagName === "A" || !!el.querySelector(":scope > a[href]");
      const shortTxt = (el.innerText || "").trim().length <= 140;
      if ((hasBg || isLink) && shortTxt) push(el, hasBg);
    });

    // 3) Reklam isimli class/id + iframe'ler
    for (const el of document.querySelectorAll("[class], [id], iframe")) {
      if (samples.length >= 30) break;
      if (el.tagName === "IFRAME" || looksAdNamed(el)) push(el);
    }

    return samples;
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
      console.info("[Sentinel] kozmetik: AI seçicileri =", out?.selectors,
        "| debug =", out?.debug, "| uygulanan =", safe);
      if (safe.length) injectCSS(safe);
    }, 2500);
  }

  injectCSS(GENERIC);

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
