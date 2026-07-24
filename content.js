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

  /** AI'a göndermek için şüpheli element örnekleri toplar (küçük, anonim özet). */
  function sampleSuspects() {
    const suspects = [];
    const candidates = document.querySelectorAll(
      'iframe, [class*="ad"], [id*="ad"], [class*="banner"], [class*="sponsor"], [class*="promo"]'
    );
    for (const el of candidates) {
      if (suspects.length >= 25) break;
      const r = el.getBoundingClientRect();
      if (r.width < 50 || r.height < 40) continue; // görünmez/ufak şeyleri atla
      suspects.push({
        tag: el.tagName.toLowerCase(),
        id: el.id?.slice(0, 60) || undefined,
        cls: (typeof el.className === "string" ? el.className : "").slice(0, 120) || undefined,
        src: el.src ? new URL(el.src, location.href).hostname : undefined,
        w: Math.round(r.width), h: Math.round(r.height),
      });
    }
    return suspects;
  }

  async function run() {
    // 1) Önce cache'e bak (cache'ten gelse bile güvenlik testinden geçir)
    const res = await chrome.runtime.sendMessage({ type: "GET_COSMETIC", hostname: HOST });
    if (res?.selectors) { injectCSS(safeSelectors(res.selectors)); return; } // cache HIT → AI yok

    // 2) Cache boş → sayfa otursun, örnekle, AI'a bir kez sor
    setTimeout(async () => {
      const samples = sampleSuspects();
      if (!samples.length) return;
      const out = await chrome.runtime.sendMessage({
        type: "CLASSIFY_ELEMENTS", hostname: HOST, samples,
      });
      if (out?.selectors?.length) injectCSS(safeSelectors(out.selectors));
    }, 2500);
  }

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
