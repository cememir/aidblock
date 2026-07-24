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

  // ---- Sağ tık ile engelleme: son sağ tıklanan element burada tutulur ----
  let lastContextTarget = null;
  document.addEventListener("contextmenu", (e) => { lastContextTarget = e.target; }, true);

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

  // Görünür reklam etiketi: kutunun metni "Reklam"/"Sponsorlu" ile başlıyorsa
  // neredeyse kesin reklamdır (siteler yasal zorunlulukla etiketler).
  const AD_LABEL = /^(reklam[ıi]?|sponsorlu|sponsored|sponsor|advertisement|anzeige)\b/i;
  function hasAdLabel(el) {
    const t = (el.innerText || "").trim().slice(0, 30);
    return AD_LABEL.test(t);
  }

  /**
   * Liste elemanı mı? (forum konu satırları gibi tekrar eden kardeşler → reklam değil)
   * İstisna: görsel/arka plan görseli içerenler — reklam slotları da aynı class'lı
   * kardeşler halinde dizilir, onları elememeliyiz.
   */
  function isRepeatedListItem(el) {
    if (el.querySelector?.("img") || getComputedStyle(el).backgroundImage !== "none") return false;
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
   * Banner'ın en dış sarmalayıcısına tırmanır: ebeveyn, elementle yaklaşık aynı
   * boyuttaysa ve az çocuğu varsa (kapatma butonu, renkli şerit arka planı gibi)
   * onu gizlemek görsel artık bırakmaz. En fazla 3 seviye, boyut sınırlı.
   */
  function climbWrapper(el) {
    let cur = el;
    for (let k = 0; k < 3; k++) {
      const p = cur.parentElement;
      if (!p || p === document.body || p.tagName === "MAIN" || p.tagName === "NAV") break;
      const rc = cur.getBoundingClientRect();
      const rp = p.getBoundingClientRect();
      const similarH = rp.height <= rc.height * 1.5 + 40;
      const similarW = rp.width <= Math.max(rc.width * 1.5, rc.width + 300);
      if (p.children.length <= 3 && similarH && similarW) cur = p;
      else break;
    }
    return cur;
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
        rel: a?.rel ? a.rel.slice(0, 40) : undefined,
        lbl: hasAdLabel(el) || undefined,
        bg: bg || undefined,
        txt: (el.innerText || el.alt || "").trim().replace(/\s+/g, " ").slice(0, 90) || undefined,
        w: Math.round(r.width), h: Math.round(r.height),
        x: Math.round(r.left), y: Math.round(r.top + scrollY),
      });
    }

    // 0) Görünür "Reklam"/"Sponsorlu" etiketli kutular (yan paneller, sponsor
    //    şeritleri — siteler yasal zorunlulukla etiketler, en güçlü sinyal)
    document.querySelectorAll("div, section, aside, span, b, strong").forEach((el) => {
      if (samples.length >= 30) return;
      const own = (el.childNodes[0]?.nodeType === 3 ? el.childNodes[0].nodeValue : "") || "";
      if (!AD_LABEL.test(own.trim())) return;
      // Etiketin kendisini değil, ait olduğu kutuyu örnekle
      const box = el.parentElement && el.parentElement !== document.body ? el.parentElement : el;
      push(climbWrapper(box));
    });

    // 0b) nofollow/sponsored görsel linkler: forumlarda banner'ların standart
    //     işareti (<a rel="nofollow noopener" target="_blank"><img>)
    document.querySelectorAll('a[rel~="nofollow"] img, a[rel~="sponsored"] img').forEach((img) => {
      if (samples.length >= 30) return;
      const r = img.getBoundingClientRect();
      const aw = r.width || img.width, ah = r.height || img.height; // lazyload: attribute boyutu
      if (aw >= 100 && ah >= 30) push(climbWrapper(img.closest("a")));
    });

    // 1) Görsel içeren linkler (iç/dış fark etmez — yönlendirme linkleri de reklam olabilir)
    document.querySelectorAll("a[href] img").forEach((img) => {
      const r = img.getBoundingClientRect();
      if (r.width >= 120 && r.height >= 40) push(climbWrapper(img.closest("a[href]")));
    });

    // 2) Banner geometrili TÜM görseller (linksiz/onclick'li reklam yapıları dahil):
    //    geniş-kısa oranlı (728x90, 970x90...) veya yan kutu boyutlu görseller
    document.querySelectorAll("img").forEach((img) => {
      if (samples.length >= 30) return;
      const r = img.getBoundingClientRect();
      const wideBanner = r.width >= 250 && r.height >= 40 && r.height <= 300 && r.width / r.height >= 2.5;
      const boxBanner = r.width >= 150 && r.width <= 420 && r.height >= 200 && r.height <= 650;
      if (wideBanner || boxBanner) push(climbWrapper(img));
    });

    // 3) Arka plan görselli linkler / banner geometrili bloklar
    document.querySelectorAll("a[href], div, section, aside").forEach((el) => {
      if (samples.length >= 30) return;
      const r = el.getBoundingClientRect();
      const fullBar = r.width >= vw * 0.55 && r.height >= 30 && r.height <= 140; // üst şerit
      const midBanner = r.width >= 250 && r.height >= 40 && r.height <= 160 && r.width / r.height >= 2.5; // 728x90 sınıfı
      const sideBox = r.width >= 150 && r.width <= 420 && r.height >= 200 && r.height <= 650; // yan kutu
      if (!fullBar && !midBanner && !sideBox) return;
      const style = getComputedStyle(el);
      const hasBg = style.backgroundImage !== "none";
      const isLink = el.tagName === "A" || !!el.querySelector(":scope > a[href]");
      const shortTxt = (el.innerText || "").trim().length <= 140;
      if ((hasBg || isLink) && shortTxt) push(climbWrapper(el), hasBg);
    });

    // 4) Reklam isimli class/id + iframe'ler
    for (const el of document.querySelectorAll("[class], [id], iframe")) {
      if (samples.length >= 30) break;
      if (el.tagName === "IFRAME" || looksAdNamed(el)) push(el);
    }

    return samples;
  }

  // ---- Sağ tık engelleme + topluluk oyu ----

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "CONTEXT_BLOCK") {
      if (!lastContextTarget) { sendResponse({ ok: false }); return; }
      const target = climbWrapper(lastContextTarget);
      const sel = cssPath(target);
      target.style.setProperty("display", "none", "important");
      injectCSS([sel]); // sonraki yüklemeler için de stil bloğu
      chrome.runtime.sendMessage({ type: "SAVE_USER_RULE", hostname: HOST, selector: sel });
      sendResponse({ ok: true, selector: sel });
    }
  });

  /**
   * Beklemedeki topluluk kuralı için oy kutusu: hedef element vurgulanır,
   * kullanıcı "reklam" derse gizlenir ve +1, değilse -1 oyu gönderilir.
   * Sayfa başına en fazla bir soru sorulur.
   */
  function askVote(pending) {
    const item = pending.find((p) => {
      try { return document.querySelector(p.selector); } catch { return false; }
    });
    if (!item) return;
    const el = document.querySelector(item.selector);
    const oldOutline = el.style.outline;
    el.style.outline = "3px dashed #f59e0b";
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#161b23;" +
      "color:#dfe6ee;border:1px solid #334155;border-radius:10px;padding:12px 14px;" +
      "font:13px/1.5 system-ui,sans-serif;max-width:280px;box-shadow:0 6px 24px rgba(0,0,0,.4)";
    const q = document.createElement("div");
    q.textContent = chrome.i18n.getMessage("votePromptText");
    q.style.marginBottom = "8px";
    const mkBtn = (label, bgColor) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.cssText =
        `margin-right:8px;padding:5px 14px;border:0;border-radius:6px;cursor:pointer;` +
        `font:inherit;color:#0e1116;background:${bgColor}`;
      return b;
    };
    const yes = mkBtn(chrome.i18n.getMessage("voteYes"), "#4ade80");
    const no = mkBtn(chrome.i18n.getMessage("voteNo"), "#94a3b8");
    const done = (vote) => {
      chrome.runtime.sendMessage({ type: "COMMUNITY_VOTE", hostname: HOST, selector: item.selector, vote });
      el.style.outline = oldOutline;
      if (vote > 0) el.style.setProperty("display", "none", "important");
      box.remove();
    };
    yes.onclick = () => done(1);
    no.onclick = () => done(-1);
    box.append(q, yes, no);
    document.documentElement.appendChild(box);
    setTimeout(() => { el.style.outline = oldOutline; box.remove(); }, 30000); // cevapsız → kapan
  }

  async function run() {
    // 1) Önce cache'e bak (cache'ten gelse bile güvenlik testinden geçir)
    const res = await chrome.runtime.sendMessage({ type: "GET_COSMETIC", hostname: HOST });

    // Kullanıcının sağ tıkla engelledikleri: kendi seçimi olduğundan guard'sız uygulanır
    if (res?.userSelectors?.length) injectCSS(res.userSelectors);

    // Topluluk kuralları: onaylılar guard'dan geçirilip uygulanır,
    // beklemedekiler için (varsa) tek bir oy sorusu gösterilir
    if (res?.community) {
      const approved = safeSelectors(res.community.approved || []);
      if (approved.length) {
        console.info("[Sentinel] topluluk:", approved.length, "onaylı kural uygulandı");
        injectCSS(approved);
      }
      if (res.community.pending?.length) {
        setTimeout(() => askVote(res.community.pending), 3000);
      }
    }

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
