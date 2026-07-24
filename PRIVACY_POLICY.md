# Privacy Policy / Gizlilik Politikası — Sentinel — AI AdBlock

_Last updated / Son güncelleme: 2026-07-24_

---

## English

**Sentinel — AI AdBlock** is an open-source browser extension. It has **no backend server**, no analytics, no telemetry and no user accounts.

### What data is processed?

| Data | Where it goes | Why |
|---|---|---|
| Your AI API key (OpenAI / Google Gemini / DeepSeek / Anthropic Claude) | Stored **only** in your browser via `chrome.storage.local`. Sent **only** to the official API endpoint of the provider **you** selected, over HTTPS. | To authenticate the AI requests you configured. |
| Third-party **domain names** seen on pages you visit (e.g. `adnetwork.com`) | Sent in batches to your selected AI provider. | To classify each domain as advertising/tracking or legitimate. |
| A **simplified snapshot of page structure** (scripts/styles removed, visible text truncated to ~70 chars per node) | Sent once per site to your selected AI provider, then the resulting CSS selectors are cached locally for 7 days. | To generate cosmetic (CSS) ad-hiding rules. |
| **Community rules (optional, off by default)**: site hostname + CSS selector of ads you block via right-click | Sent anonymously to the community server URL **you** configure in the settings. Nothing is sent if no URL is set. | Crowd-sourced ad rules: rules are score-voted and applied for other users once approved. |
| Block/allow verdicts, statistics, cached CSS selectors | Stored only in your browser (`chrome.storage.local`). | Caching, so the AI is not called twice for the same domain/site. |

### What is NOT collected

- No browsing history is collected or transmitted anywhere by the developer.
- Form data, passwords and personal information are never targeted or extracted. The page snapshot sent to your AI provider is structural, with visible text heavily truncated.
- The developer operates **no servers** and receives **no data whatsoever**.
- Your API key is never synced, never shared, never sent to anyone except the provider you chose.

### Third parties

Network communication happens only between your browser and (a) the AI provider **you configure** (OpenAI, Google, DeepSeek or Anthropic) and (b) — only if you enable it — the community rules server **you configure**. Their respective privacy policies apply to those requests. If you set no API key, the extension works fully offline using its built-in static blocklist and sends nothing anywhere.

### Data removal

All stored data (key, cache, statistics) lives in your browser. Use the popup's "Clear cache" button, remove the key from the settings page, or uninstall the extension to erase everything.

### Contact

Developers: Muslu YÜKSEKTEPE (<musluyuksektepe@gmail.com>), Cem Emir YÜKSEKTEPE (<cememir2017@gmail.com>).
Questions: open an issue at <https://github.com/cememir/aidblock>.

---

## Türkçe

**Sentinel — AI AdBlock** açık kaynaklı bir tarayıcı eklentisidir. **Arka uç sunucusu yoktur**; analitik, telemetri veya kullanıcı hesabı içermez.

### Hangi veriler işlenir?

| Veri | Nereye gider | Neden |
|---|---|---|
| AI API anahtarınız (OpenAI / Google Gemini / DeepSeek / Anthropic Claude) | **Yalnızca** tarayıcınızda `chrome.storage.local` içinde saklanır. **Yalnızca sizin seçtiğiniz** sağlayıcının resmi API adresine HTTPS ile gönderilir. | Yapılandırdığınız AI isteklerinin kimlik doğrulaması için. |
| Ziyaret ettiğiniz sayfalarda görülen üçüncü taraf **alan adları** (örn. `adnetwork.com`) | Toplu halde seçtiğiniz AI sağlayıcısına gönderilir. | Her alan adını reklam/izleme veya meşru olarak sınıflandırmak için. |
| **Sadeleştirilmiş sayfa yapısı özeti** (script/stiller çıkarılmış, görünür metinler ~70 karaktere kısaltılmış) | Site başına bir kez seçili sağlayıcıya gönderilir; üretilen CSS seçicileri 7 gün yerelde önbelleklenir. | Kozmetik (CSS) reklam gizleme kuralları üretmek için. |
| **Topluluk kuralları (opsiyonel, varsayılan kapalı)**: sağ tıkla engellediğiniz reklamların alan adı + CSS seçicisi | **Sizin** ayarlarda yapılandırdığınız topluluk sunucusuna anonim gönderilir. Adres girilmezse hiçbir şey gönderilmez. | Kitle kaynaklı reklam kuralları: kurallar puanla oylanır, onaylananlar diğer kullanıcılarda da uygulanır. |
| Engelle/izin ver kararları, istatistikler, önbellekli CSS seçicileri | Yalnızca tarayıcınızda saklanır (`chrome.storage.local`). | Aynı alan adı/site için AI'ın tekrar çağrılmaması için. |

### Toplanmayanlar

- Gezinme geçmişi geliştirici tarafından toplanmaz, hiçbir yere iletilmez.
- Form verileri, parolalar ve kişisel bilgiler asla hedeflenmez veya ayıklanmaz. AI sağlayıcınıza giden sayfa özeti yapısaldır; görünür metinler büyük ölçüde kısaltılır.
- Geliştiricinin **sunucusu yoktur** ve **hiçbir veri almaz**.
- API anahtarınız asla senkronize edilmez, paylaşılmaz; seçtiğiniz sağlayıcı dışında kimseye gönderilmez.

### Üçüncü taraflar

Ağ iletişimi yalnızca tarayıcınız ile (a) **sizin yapılandırdığınız** AI sağlayıcısı (OpenAI, Google, DeepSeek veya Anthropic) ve (b) — yalnızca siz etkinleştirirseniz — **sizin yapılandırdığınız** topluluk kuralları sunucusu arasındadır. Bu isteklere ilgili sağlayıcının gizlilik politikası uygulanır. API anahtarı girmezseniz eklenti, dahili statik engel listesiyle tamamen çevrimdışı çalışır ve hiçbir yere veri göndermez.

### Verilerin silinmesi

Saklanan tüm veriler (anahtar, önbellek, istatistikler) tarayıcınızdadır. Popup'taki "Önbelleği temizle" butonunu kullanın, ayarlar sayfasından anahtarı silin veya eklentiyi kaldırın — her şey silinir.

### İletişim

Geliştiriciler: Muslu YÜKSEKTEPE (<musluyuksektepe@gmail.com>), Cem Emir YÜKSEKTEPE (<cememir2017@gmail.com>).
Sorular için: <https://github.com/cememir/aidblock> üzerinden issue açabilirsiniz.
