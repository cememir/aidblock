/**
 * Sentinel — content.js
 * Ağ katmanında engellenemeyen sayfa-içi reklam kutularını gizler.
 * 1. Genel (evrensel) seçiciler her sayfada anında uygulanır.
 * 2. Bu siteye özel seçiciler önce ÖNBELLEKTEN istenir.
 * 3. Cache boşsa, sayfanın SADELEŞTİRİLMİŞ HTML'i AI'a gönderilir; AI reklam
 *    kapsayıcıları için class/id tabanlı CSS seçicileri döndürür. Seçiciler
 *    çalışma anı güvenlik testinden geçirilip uygulanır, 7 gün cache'lenir.
 * 4. Sağ tık → "reklam olarak engelle" kuralları + topluluk kuralları uygulanır.
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

  /**
   * Element için kararlı, tekil CSS yolu üretir (id varsa kısalır).
   * DİKKAT: "body > " öneki YALNIZCA zincir gerçekten body'ye ulaştıysa
   * eklenir — aksi halde derin DOM'larda hiçbir şeyle eşleşmeyen ölü
   * seçiciler üretilir (r10.net hatası buydu).
   */
  function cssPath(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body && parts.length < 14) {
      const p = node.parentElement;
      if (!p) break;
      const idx = Array.prototype.indexOf.call(p.children, node) + 1;
      parts.unshift(`${node.tagName.toLowerCase()}:nth-child(${idx})`);
      if (p.id) { parts.unshift(`#${CSS.escape(p.id)}`); return parts.join(" > "); }
      node = p;
    }
    if (node === document.body) parts.unshift("body");
    return parts.join(" > ");
  }

  /** Yol gerçekten bu elemente (ve yalnızca ona) çözülüyor mu? */
  function pathResolves(sel, el) {
    try {
      const found = document.querySelectorAll(sel);
      return found.length === 1 && found[0] === el;
    } catch { return false; }
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

  // ---- Deterministik banner katmanı (AI'sız) ----
  // IAB standart banner boyutları: bu boyutlardaki nofollow/sponsored görsel
  // linkler pratikte her zaman reklamdır (forumlar dahil).
  const BANNER_SIZES = [
    [728, 90], [728, 91], [970, 90], [970, 250], [468, 60], [320, 50],
    [300, 250], [336, 280], [300, 600], [160, 600], [120, 600], [250, 250],
  ];
  function isBannerSize(w, h) {
    return BANNER_SIZES.some(([bw, bh]) => Math.abs(w - bw) <= 12 && Math.abs(h - bh) <= 12);
  }

  /**
   * rel=nofollow/sponsored bir linkin içindeki görsel standart banner
   * boyutundaysa sarmalayıcısıyla birlikte gizler. Lazyload görseller geç
   * boyutlandığı için iki kez (erken + geç) çağrılır.
   */
  function hideBannerLinks() {
    let n = 0;
    document.querySelectorAll('a[rel~="nofollow"] img, a[rel~="sponsored"] img').forEach((img) => {
      const a = img.closest("a");
      if (!a || a.dataset.sentinelBanner) return;
      const r = img.getBoundingClientRect();
      const w = r.width || img.width, h = r.height || img.height;
      if (!isBannerSize(w, h)) return;
      a.dataset.sentinelBanner = "1";
      const wrap = climbWrapper(a);
      wrap.style.setProperty("display", "none", "important");
      n++;
    });
    if (n) console.info("[Sentinel] banner-link:", n, "nofollow banner gizlendi");
  }

  /**
   * Sayfanın sadeleştirilmiş HTML anlık görüntüsünü üretir — AI'a gönderilir.
   * script/style/svg vb. atılır, metinler ve uzun attribute'lar kısaltılır;
   * yapı (tag + class + id + href/src) korunur ki AI class/id tabanlı
   * seçiciler üretebilsin.
   */
  function htmlSnapshot() {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll(
      "script, style, link, noscript, svg, template, canvas, video, audio, picture > source"
    ).forEach((n) => n.remove());

    // Metin düğümlerini kısalt (yapı önemli, içerik değil)
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    for (const t of texts) {
      const s = t.nodeValue.replace(/\s+/g, " ").trim();
      t.nodeValue = s.length > 70 ? s.slice(0, 70) + "…" : s;
    }

    // Uzun attribute'ları kısalt (style, srcset, data-url'ler...).
    // sandbox/allow gibi TOKEN LİSTESİ attribute'ları kısaltılMAZ — ortadan
    // kesilen token ("allow-popups-to-escape-sandbo") tarayıcı klonda bile
    // ayrıştırdığı için konsola hata yazar; AI'ya gerek de yok, silinir.
    clone.querySelectorAll("*").forEach((el) => {
      for (const attr of [...el.attributes]) {
        try {
          if (attr.name === "sandbox" || attr.name === "allow" || attr.name === "srcset") {
            el.removeAttribute(attr.name);
          } else if (attr.name === "style" && attr.value.length > 60) {
            el.setAttribute("style", attr.value.slice(0, 60));
          } else if (attr.value.length > 120) {
            el.setAttribute(attr.name, attr.value.slice(0, 120));
          }
        } catch { el.removeAttribute(attr.name); }
      }
    });

    return clone.innerHTML
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 45000);
  }

  // ---- Ortak mini UI yardımcıları (onay kutusu, oy kutusu, rozet) ----

  function uiBox() {
    const box = document.createElement("div");
    box.style.cssText =
      "position:fixed;bottom:16px;right:16px;z-index:2147483647;background:#161b23;" +
      "color:#dfe6ee;border:1px solid #334155;border-radius:10px;padding:12px 14px;" +
      "font:13px/1.5 system-ui,sans-serif;max-width:300px;box-shadow:0 6px 24px rgba(0,0,0,.4)";
    return box;
  }

  function uiBtn(label, bg, fg = "#0e1116") {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText =
      `margin:6px 8px 0 0;padding:5px 14px;border:0;border-radius:6px;cursor:pointer;` +
      `font:inherit;color:${fg};background:${bg}`;
    return b;
  }

  // ---- Sağ tık engelleme: alan vurgulanır, onaylanırsa engellenir ----

  let picker = null; // aktif seçim oturumu

  function cancelPicker() {
    if (!picker) return;
    picker.unmark();
    picker.box.remove();
    picker = null;
  }

  function startPicker(initial) {
    cancelPicker();
    let target = climbWrapper(initial);
    let saved = "";
    const mark = (el) => { saved = el.style.outline; el.style.outline = "3px dashed #ef4444"; el.style.outlineOffset = "-2px"; };
    const unmark = () => { if (target) { target.style.outline = saved; target.style.outlineOffset = ""; } };
    mark(target);

    const box = uiBox();
    const q = document.createElement("div");
    q.textContent = chrome.i18n.getMessage("ctxConfirmText");
    const block = uiBtn(chrome.i18n.getMessage("ctxConfirmYes"), "#ef4444", "#fff");
    const grow = uiBtn(chrome.i18n.getMessage("ctxExpand"), "#334155", "#dfe6ee");
    const cancel = uiBtn(chrome.i18n.getMessage("ctxCancel"), "#94a3b8");

    grow.onclick = () => {
      // Seçimi bir üst sarmalayıcıya genişlet (body'ye kadar)
      const p = target.parentElement;
      if (!p || p === document.body) return;
      unmark();
      target = p;
      mark(target);
    };
    block.onclick = () => {
      unmark();
      const sel = cssPath(target);
      target.style.setProperty("display", "none", "important");
      injectCSS([sel]); // sonraki yüklemeler için de stil bloğu
      chrome.runtime.sendMessage({ type: "SAVE_USER_RULE", hostname: HOST, selector: sel });
      box.remove();
      picker = null;
    };
    cancel.onclick = cancelPicker;

    box.append(q, block, grow, cancel);
    document.documentElement.appendChild(box);
    picker = { box, unmark };
    setTimeout(cancelPicker, 30000); // cevapsız kalırsa kendiliğinden kapan
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === "CONTEXT_BLOCK") {
      if (!lastContextTarget) { sendResponse({ ok: false }); return; }
      startPicker(lastContextTarget);
      sendResponse({ ok: true });
    }
  });

  // ---- AI analiz rozeti: cevap gelene kadar küçük bir "tarama" göstergesi ----

  function showScanBadge() {
    const badge = uiBox();
    badge.style.display = "flex";
    badge.style.alignItems = "center";
    badge.style.gap = "10px";
    badge.style.padding = "8px 12px";
    const spin = document.createElement("span");
    spin.style.cssText =
      "width:14px;height:14px;flex:none;border:2px solid #334155;border-top-color:#4ade80;" +
      "border-radius:50%;animation:sentinel-spin .8s linear infinite";
    const style = document.createElement("style");
    style.textContent = "@keyframes sentinel-spin{to{transform:rotate(360deg)}}";
    const txt = document.createElement("span");
    txt.textContent = chrome.i18n.getMessage("aiScanning");
    badge.append(style, spin, txt);
    document.documentElement.appendChild(badge);
    return () => badge.remove();
  }

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

    const box = uiBox();
    const q = document.createElement("div");
    q.textContent = chrome.i18n.getMessage("votePromptText");
    const yes = uiBtn(chrome.i18n.getMessage("voteYes"), "#4ade80");
    const no = uiBtn(chrome.i18n.getMessage("voteNo"), "#94a3b8");
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

    // Deterministik banner katmanı: nofollow + standart boyut = reklam.
    // Lazyload görseller geç boyutlanır → erken ve geç iki geçiş.
    if (!res?.noCosmetic) {
      hideBannerLinks();
      setTimeout(hideBannerLinks, 3500);
    }

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

    // 2) Cache boş → sayfa otursun, sadeleştirilmiş HTML'i AI'a bir kez gönder
    setTimeout(async () => {
      const html = htmlSnapshot();
      console.info("[Sentinel] kozmetik: AI'a gönderilen HTML boyutu =", html.length, "karakter");
      if (html.length < 200) return;
      const hideBadge = showScanBadge(); // ziyaretçi analizin sürdüğünü görsün
      try {
        const out = await chrome.runtime.sendMessage({
          type: "CLASSIFY_HTML", hostname: HOST, html,
        });
        const safe = safeSelectors(out?.selectors || []);
        console.info("[Sentinel] kozmetik: AI seçicileri =", out?.selectors,
          "| debug =", out?.debug, "| uygulanan =", safe);
        if (safe.length) injectCSS(safe);
      } finally {
        hideBadge();
      }
    }, 2500);
  }

  injectCSS(GENERIC);

  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
})();
