const $ = (id) => document.getElementById(id);
const t = (key) => chrome.i18n.getMessage(key);
const nf = new Intl.NumberFormat(chrome.i18n.getUILanguage());

// data-i18n etiketli tüm metinleri bas
document.querySelectorAll("[data-i18n]").forEach((el) => {
  el.textContent = t(el.dataset.i18n);
});

function fmt(n) { return nf.format(n || 0); }

async function refresh() {
  const s = await chrome.runtime.sendMessage({ type: "GET_STATS" });
  $("today").textContent = fmt(s.stats?.blockedToday);
  $("total").textContent = fmt(s.stats?.blockedTotal);
  $("cache").textContent = fmt(s.cachedDomains);
  $("blockedDomains").textContent = fmt(s.blockedDomains);
  $("toggle").checked = s.enabled;
  $("dot").classList.toggle("off", !s.enabled);
  $("statusText").textContent = s.enabled ? t("statusActive") : t("statusOff");
  $("provider").textContent = s.hasKey ? s.provider : "";
  $("keyWarn").style.display = s.hasKey ? "none" : "block";
}

/** Aktif sekmeyi yeniler — toggle sonrası sayfanın yeni duruma göre yüklenmesi için. */
async function reloadActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && /^https?:/.test(tab.url || "")) chrome.tabs.reload(tab.id);
}

$("toggle").addEventListener("change", async (e) => {
  await chrome.runtime.sendMessage({ type: "TOGGLE", value: e.target.checked });
  await refresh();
  // Koruma kapatılınca (veya açılınca) sayfa yenilensin ki değişiklik anında görülsün
  await reloadActiveTab();
});

// Bu sitenin kozmetik önbelleğini silip sayfayı yeniler — AI siteyi yeniden tarar
$("rescan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !/^https?:/.test(tab.url || "")) return;
  const host = new URL(tab.url).hostname.replace(/^www\./, "");
  await chrome.runtime.sendMessage({ type: "RESCAN_HOST", hostname: host });
  chrome.tabs.reload(tab.id);
  window.close();
});

$("clearCache").addEventListener("click", async () => {
  await chrome.runtime.sendMessage({ type: "CLEAR_CACHE" });
  refresh();
});

$("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());
$("settings").addEventListener("click", () => chrome.runtime.openOptionsPage());

refresh();
