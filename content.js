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

    // Uzun attribute'ları kısalt (style, srcset, data-url'ler...)
    clone.querySelectorAll("*").forEach((el) => {
      for (const attr of [...el.attributes]) {
        if (attr.value.length > 120) el.setAttribute(attr.name, attr.value.slice(0, 120));
        if (attr.name === "style" && attr.value.length > 60) el.setAttribute("style", attr.value.slice(0, 60));
      }
    });

    return clone.innerHTML
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s{2,}/g, " ")
      .slice(0, 45000);
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

    // 2) Cache boş → sayfa otursun, sadeleştirilmiş HTML'i AI'a bir kez gönder
    setTimeout(async () => {
      const html = htmlSnapshot();
      console.info("[Sentinel] kozmetik: AI'a gönderilen HTML boyutu =", html.length, "karakter");
      if (html.length < 200) return;
      const out = await chrome.runtime.sendMessage({
        type: "CLASSIFY_HTML", hostname: HOST, html,
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
