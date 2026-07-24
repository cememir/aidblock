# Sentinel — AI AdBlock (Chrome MV3)

Kendi kendine öğrenen, yapay zekâ destekli, sıfır-ayar reklam engelleyici.
**%100 açık kaynak** — arka uç sunucusu yok, telemetri yok, abonelik yok.

> Self-learning, AI-powered, zero-config ad blocker. 100% open source — no backend, no telemetry, no subscription. English store texts: [`store/STORE_LISTING.md`](store/STORE_LISTING.md) · Privacy: [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md)

## Nasıl çalışır?

1. **Anında engelleme** — Bilinen 20 büyük reklam/izleme ağı `rules_static.json` içindeki
   `declarativeNetRequest` kurallarıyla, AI'a hiç sorulmadan tarayıcı motorunda engellenir.
2. **AI öğrenmesi** — Sayfalardaki *tanınmayan* üçüncü taraf alan adları kuyruğa alınır ve
   toplu halde (15'erli) seçtiğiniz AI sağlayıcısına tek istekle sorulur: `block` mı `allow` mu?
3. **Önbellek** — Her karar 30 gün `chrome.storage.local`'da saklanır. Aynı alan adı
   tekrar görüldüğünde **AI hiç çağrılmaz**, cevap doğrudan cache'den gelir.
4. **Dinamik kural** — `block` kararı alan alan adları için dinamik engelleme kuralı eklenir;
   engelleme JS'te değil, ağ katmanında olur (performans kaybı yok).
5. **Kozmetik filtre** — Ağdan engellenemeyen sayfa-içi reklam kutuları için siteye özel
   CSS seçicileri AI'dan bir kez alınır, 7 gün hostname bazında cache'lenir.

## Desteklenen AI sağlayıcıları

Her kullanıcı **kendi API anahtarını** girer (ayarlar sayfasından):

| Sağlayıcı | Model | Anahtar alma |
|---|---|---|
| OpenAI | `gpt-4o-mini` | <https://platform.openai.com/api-keys> |
| Google Gemini | `gemini-2.5-flash` | <https://aistudio.google.com/apikey> |
| DeepSeek | `deepseek-chat` | <https://platform.deepseek.com/api_keys> |
| Anthropic Claude | `claude-haiku-4-5` | <https://platform.claude.com/settings/keys> |

Anahtar girilmezse eklenti yalnızca dahili statik listeyle (çevrimdışı) çalışır.

## Güvenlik

- API anahtarı **yalnızca tarayıcıda** saklanır (`chrome.storage.local`) — senkronize edilmez,
  loglanmaz, paylaşılmaz. Eklentinin arka uç sunucusu yoktur; geliştirici hiçbir veri almaz.
- Anahtar yalnızca **sizin seçtiğiniz** sağlayıcının resmi API'sine HTTPS ile gönderilir.
- AI'a yalnızca üçüncü taraf **alan adları** ve anonim reklam-kutusu özetleri gönderilir;
  sayfa içeriği, form verisi veya kişisel bilgi asla gönderilmez.
- Tüm kod bu depodadır ve denetlenebilir (MIT lisansı).

## Kurulum (geliştirici modu)

1. Depoyu klonlayın: `git clone https://github.com/cememir/aidblock.git`
2. Chrome → `chrome://extensions` → "Geliştirici modu"nu açın.
3. "Paketlenmemiş öğe yükle" → bu klasörü seçin.
4. Açılan ayarlar sayfasından sağlayıcınızı seçip API anahtarınızı girin, "Anahtarı test et" ile doğrulayın.

## Chrome Web Store yayını

- Yayın paketi: `bash scripts/build.sh` → `dist/sentinel-aidblock-v<versiyon>.zip`
- Mağaza metinleri (EN+TR), izin gerekçeleri ve yayın kontrol listesi: [`store/STORE_LISTING.md`](store/STORE_LISTING.md)
- Mağaza görselleri: `store/assets/` (ikon, 3 ekran görüntüsü, promo görselleri)

## Maliyet notu

Ucuz sınıf modeller + toplu sorgu + 30 günlük cache sayesinde tipik kullanımda günlük çağrı
sayısı birkaç düzineyi geçmez; ilk günlerden sonra neredeyse sıfıra iner (her şey cache'ten gelir).

## Dosyalar

| Dosya | Görev |
|---|---|
| `background.js` | AI sağlayıcıları, sınıflandırma, kuyruk/batch, önbellek, dinamik kurallar, istatistik |
| `rules_static.json` | Temel engel listesi (AI'sız, anında) |
| `content.js` | Kozmetik filtreleme (genel + AI seçicileri, cache'li) |
| `popup.html/js` | Toggle + istatistik + ayarlar kısayolu |
| `options.html/js` | Sağlayıcı seçimi + API anahtarları (yalnızca yerel depolama) |
| `_locales/` | EN + TR arayüz metinleri |
| `store/` | Chrome Web Store metinleri ve görselleri |
| `scripts/build.sh` | Yayın zip'i üretir |

## Geliştiriciler

- **Muslu YÜKSEKTEPE** — <musluyuksektepe@gmail.com>
- **Cem Emir YÜKSEKTEPE** — <cememir2017@gmail.com>

## Lisans

[MIT](LICENSE)
