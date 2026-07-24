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
| Anonymous **DOM element summaries** of suspected ad containers (tag name, CSS class/id, size) | Sent once per site to your selected AI provider, then cached locally for 7 days. | To generate cosmetic (CSS) ad-hiding rules. |
| Block/allow verdicts, statistics, cached CSS selectors | Stored only in your browser (`chrome.storage.local`). | Caching, so the AI is not called twice for the same domain/site. |

### What is NOT collected

- No browsing history is collected or transmitted anywhere by the developer.
- No page content, form data, passwords or personal information is read or sent.
- The developer operates **no servers** and receives **no data whatsoever**.
- Your API key is never synced, never shared, never sent to anyone except the provider you chose.

### Third parties

The only network communication is between your browser and the AI provider **you configure** (OpenAI, Google, DeepSeek or Anthropic). Their respective privacy policies apply to those requests. If you set no API key, the extension works fully offline using its built-in static blocklist and sends nothing anywhere.

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
| Şüpheli reklam kutularının anonim **DOM özetleri** (etiket adı, CSS class/id, boyut) | Site başına bir kez seçili sağlayıcıya gönderilir, sonra 7 gün yerelde önbelleklenir. | Kozmetik (CSS) reklam gizleme kuralları üretmek için. |
| Engelle/izin ver kararları, istatistikler, önbellekli CSS seçicileri | Yalnızca tarayıcınızda saklanır (`chrome.storage.local`). | Aynı alan adı/site için AI'ın tekrar çağrılmaması için. |

### Toplanmayanlar

- Gezinme geçmişi geliştirici tarafından toplanmaz, hiçbir yere iletilmez.
- Sayfa içeriği, form verileri, parolalar veya kişisel bilgiler okunmaz ve gönderilmez.
- Geliştiricinin **sunucusu yoktur** ve **hiçbir veri almaz**.
- API anahtarınız asla senkronize edilmez, paylaşılmaz; seçtiğiniz sağlayıcı dışında kimseye gönderilmez.

### Üçüncü taraflar

Tek ağ iletişimi, tarayıcınız ile **sizin yapılandırdığınız** AI sağlayıcısı (OpenAI, Google, DeepSeek veya Anthropic) arasındadır. Bu isteklere ilgili sağlayıcının gizlilik politikası uygulanır. API anahtarı girmezseniz eklenti, dahili statik engel listesiyle tamamen çevrimdışı çalışır ve hiçbir yere veri göndermez.

### Verilerin silinmesi

Saklanan tüm veriler (anahtar, önbellek, istatistikler) tarayıcınızdadır. Popup'taki "Önbelleği temizle" butonunu kullanın, ayarlar sayfasından anahtarı silin veya eklentiyi kaldırın — her şey silinir.

### İletişim

Geliştiriciler: Muslu YÜKSEKTEPE (<musluyuksektepe@gmail.com>), Cem Emir YÜKSEKTEPE (<cememir2017@gmail.com>).
Sorular için: <https://github.com/cememir/aidblock> üzerinden issue açabilirsiniz.
