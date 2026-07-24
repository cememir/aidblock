/**
 * Sentinel — options.js
 * Sağlayıcı seçimi + API anahtarları. Anahtarlar SADECE chrome.storage.local'a
 * yazılır; sync edilmez, hiçbir sunucuya gönderilmez. Test butonu anahtarı
 * yalnızca seçilen sağlayıcının resmi API'sine karşı dener.
 */

const PROVIDER_IDS = ["openai", "gemini", "deepseek", "claude"];
const $ = (sel) => document.querySelector(sel);

// i18n metinlerini bas
document.querySelectorAll("[data-i18n]").forEach((el) => {
  el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
});
document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
  el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPh);
});

function selectedProvider() {
  return document.querySelector('input[name="provider"]:checked')?.value || "openai";
}

function setStatus(text, cls) {
  const s = $("#status");
  s.textContent = text;
  s.className = cls || "";
}

async function load() {
  const { aiProvider = "openai", aiKeys = {} } = await chrome.storage.local.get(["aiProvider", "aiKeys"]);
  const radio = document.querySelector(`input[name="provider"][value="${aiProvider}"]`);
  if (radio) radio.checked = true;
  for (const p of PROVIDER_IDS) {
    $(`#key-${p}`).value = aiKeys[p] || "";
  }
}

async function save() {
  const aiKeys = {};
  for (const p of PROVIDER_IDS) {
    const v = $(`#key-${p}`).value.trim();
    if (v) aiKeys[p] = v;
  }
  const aiProvider = selectedProvider();
  await chrome.storage.local.set({ aiProvider, aiKeys });
  if (!aiKeys[aiProvider]) {
    setStatus(chrome.i18n.getMessage("optSavedNoKey"), "warn");
  } else {
    setStatus(chrome.i18n.getMessage("optSaved"), "ok");
  }
}

async function test() {
  const provider = selectedProvider();
  const key = $(`#key-${provider}`).value.trim();
  if (!key) { setStatus(chrome.i18n.getMessage("optTestNoKey"), "warn"); return; }
  setStatus(chrome.i18n.getMessage("optTesting"), "");
  const res = await chrome.runtime.sendMessage({ type: "TEST_KEY", provider, key });
  if (res?.ok) {
    setStatus(chrome.i18n.getMessage("optTestOk"), "ok");
  } else {
    setStatus(`${chrome.i18n.getMessage("optTestFail")} ${res?.error || ""}`, "err");
  }
}

$("#save").addEventListener("click", save);
$("#test").addEventListener("click", test);
load();
