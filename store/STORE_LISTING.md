# Chrome Web Store — Mağaza Metinleri / Store Listing

Bu dosya, Chrome Web Store geliştirici panelindeki alanlara birebir kopyalanacak
metinleri içerir (EN + TR). Görseller: `store/assets/` dizininde.

| Alan | Değer |
|---|---|
| Kategori (Category) | Privacy & Security |
| Dil (Default language) | English (TR çevirisi mağaza panelinden eklenir) |
| Store icon | `store/assets/store_icon_128.png` (128×128) |
| Ekran görüntüleri | `store/assets/screenshot_1..3_1280x800.png` (1280×800) |
| Küçük promo | `store/assets/promo_small_440x280.png` (440×280) |
| Marquee promo | `store/assets/promo_marquee_1400x560.png` (1400×560) |
| Privacy policy URL | `PRIVACY_POLICY.md`'yi GitHub'da yayınlayın: `https://github.com/cememir/aidblock/blob/main/PRIVACY_POLICY.md` |
| Destek e-postası (Support email) | `musluyuksektepe@gmail.com` (alternatif: `cememir2017@gmail.com`) |
| Geliştiriciler | Muslu YÜKSEKTEPE · Cem Emir YÜKSEKTEPE |

---

## 🇬🇧 English

### Name (max 45 chars)

```
Sentinel — AI AdBlock
```

### Short description / Summary (max 132 chars)

```
Self-learning AI ad blocker. Blocks known ad networks instantly, learns new ones in the background. Bring your own API key.
```

### Detailed description

```
Sentinel is an ad blocker that maintains its own blocklist — with AI.

Traditional ad blockers depend on huge, hand-maintained filter lists that constantly lag behind new ad networks. Sentinel takes a different approach: a built-in list blocks 150+ known ad & tracking networks instantly, and everything unknown is classified by AI in the background — once — then cached.

⚡ HOW IT WORKS
• Known ad networks (DoubleClick, Taboola, Criteo, PubMatic…) are blocked at the network layer, before they even load. No AI call needed.
• Unknown third-party domains are collected, batched, and sent to your chosen AI model with a single question: ad/tracker, or legitimate?
• Every verdict is cached for 30 days. A domain is asked about only once — repeat visits cost you nothing and add zero latency.
• Domains classified as ads become native browser blocking rules (declarativeNetRequest), so blocking happens in the browser engine with no performance penalty.
• Leftover in-page ad boxes are hidden with site-specific CSS selectors: a simplified snapshot of the page structure is analyzed by AI once per site, cached for 7 days. A small badge shows while analysis runs.
• Standard-size banner images inside rel="nofollow"/"sponsored" links are hidden instantly by a deterministic rule — no AI call needed.
• Right-click any ad → "Sentinel: block this element". The area is outlined for confirmation (Block / Expand / Cancel) and the rule is remembered per site.
• Optional community rules: share your right-click blocks anonymously (hostname + CSS selector only) with a self-hostable server; rules with a net score of +3 apply automatically for everyone, lower-scored ones are shown as a yes/no vote. Fully disabled unless you set a server URL.

🔑 YOUR KEY, YOUR CHOICE OF AI
Sentinel has no subscription and no backend. You bring your own API key from any of:
• OpenAI (gpt-4o-mini)
• Google Gemini (gemini-2.5-flash)
• DeepSeek (deepseek-chat)
• Anthropic Claude (claude-haiku-4-5)

Thanks to batching and the 30-day cache, typical usage costs only a few dozen tiny API calls per day at most — and near zero after the first days of browsing.

🔒 SECURITY & PRIVACY — BY DESIGN
• Your API key is stored ONLY in your browser (chrome.storage.local). It is never synced, never logged, never shared.
• The key is sent exclusively to the official API of the provider YOU selected, over HTTPS.
• There is no backend server. The developer receives no data at all — no history, no pages, no keys.
• The AI receives third-party DOMAIN NAMES and, once per site, a simplified structural snapshot of the page (scripts/styles removed, text truncated) — sent ONLY to the provider you configured, never to the developer. Forms, passwords and personal data are never targeted.
• 100% open source. Audit every line: https://github.com/cememir/aidblock

📊 SIMPLE BY DESIGN
One on/off switch, live statistics, right-click element blocking, a per-site rescan button and a settings page for your API key. No filter list management, no subscriptions.

No API key? Sentinel still works fully offline with its built-in blocklist.
```

### Single purpose description (Privacy tab)

```
Sentinel blocks advertising and tracking requests. It uses a built-in blocklist for known ad networks and an AI classifier (using the user's own API key) to identify and block unknown ad/tracking domains and hide residual ad containers.
```

### Permission justifications (Privacy tab)

| Permission | Justification |
|---|---|
| `declarativeNetRequest` | Core ad-blocking mechanism: static rules for known ad networks and dynamic rules for domains classified as ads by the AI. Blocking happens natively in the browser engine. |
| `webRequest` (observational) | Used ONLY to observe request URLs so unknown third-party domains can be queued for AI classification, and to count blocked requests for the statistics shown in the popup. It does not and cannot block requests (MV3). |
| `storage` | Stores the user's API key, the 30-day verdict cache, cosmetic-filter cache and statistics locally. Prevents repeated AI calls. |
| `alarms` | A once-per-minute alarm flushes the pending classification queue even if the service worker was suspended. |
| `contextMenus` | Adds the right-click item "Sentinel: block this element as an ad" so the user can manually hide an ad after visual confirmation. |
| Host permission `<all_urls>` | Ads appear on every website; the extension must observe third-party requests and apply cosmetic filtering on any page the user visits. A simplified page-structure snapshot is sent only to the AI provider the user configured — never to the developer. |
| Remote code | Not used. All code is packaged; AI APIs return only JSON data (block/allow verdicts and CSS selector strings), never executable code. |

### Data usage disclosures (Privacy tab checkboxes)

- Collects: **Website content** → No (a simplified page snapshot is sent only to the AI provider the user configured with their own key; the developer operates no server and collects nothing). **Web history** → No (domain names are processed in-memory and sent only to the user-configured AI provider).
- Optional community feature: disabled by default; when the user sets a server URL, only the site hostname + CSS selector of manually blocked ads are shared anonymously.
- Data is **not** sold, **not** used for unrelated purposes, **not** used for creditworthiness.

---

## 🇹🇷 Türkçe

### Ad (en fazla 45 karakter)

```
Sentinel — AI AdBlock
```

### Kısa açıklama / Özet (en fazla 132 karakter)

```
Kendi kendine öğrenen yapay zekâ destekli reklam engelleyici. Bilinen ağları anında engeller, yenilerini arka planda öğrenir.
```

### Ayrıntılı açıklama

```
Sentinel, engel listesini yapay zekâ ile kendisi oluşturan bir reklam engelleyicidir.

Geleneksel reklam engelleyiciler, elle güncellenen ve yeni reklam ağlarının hep gerisinde kalan dev filtre listelerine bağımlıdır. Sentinel farklı çalışır: dahili liste 150'den fazla bilinen reklam/izleme ağını anında engeller; tanınmayan her şey arka planda yapay zekâya BİR KEZ sorulur ve sonuç önbelleğe alınır.

⚡ NASIL ÇALIŞIR?
• Bilinen reklam ağları (DoubleClick, Taboola, Criteo, PubMatic…) daha yüklenmeden, ağ katmanında engellenir. AI çağrısı gerekmez.
• Tanınmayan üçüncü taraf alan adları toplanır, gruplanır ve seçtiğiniz AI modeline tek soruyla gönderilir: reklam/izleyici mi, meşru mu?
• Her karar 30 gün önbelleklenir. Bir alan adı yalnızca bir kez sorulur — tekrar ziyaretler ücretsizdir ve sıfır gecikme ekler.
• Reklam olarak sınıflandırılan alan adları tarayıcının yerel engelleme kurallarına (declarativeNetRequest) dönüşür; engelleme tarayıcı motorunda olur, performans kaybı yaşanmaz.
• Sayfada kalan reklam kutuları siteye özel CSS seçicileriyle gizlenir: sayfa yapısının sadeleştirilmiş bir özeti site başına BİR KEZ AI ile analiz edilir, 7 gün önbelleklenir. Analiz sürerken küçük bir rozet gösterilir.
• rel="nofollow"/"sponsored" link içindeki standart boyutlu banner görselleri, AI çağrısı olmadan deterministik kuralla anında gizlenir.
• Herhangi bir reklama sağ tıklayın → "Sentinel: bu öğeyi reklam olarak engelle". Alan çizgiyle vurgulanır, onaydan sonra (Engelle / Genişlet / İptal) kural siteye özel hatırlanır.
• Opsiyonel topluluk kuralları: sağ tık engellemelerinizi anonim olarak (yalnızca alan adı + CSS seçici) kendi barındırabileceğiniz sunucuyla paylaşın; net puanı +3 kurallar herkeste otomatik uygulanır, düşük puanlılar evet/hayır oyu olarak sorulur. Sunucu adresi girilmedikçe tamamen kapalıdır.

🔑 KENDİ ANAHTARINIZ, KENDİ AI SEÇİMİNİZ
Sentinel'de abonelik ve arka uç sunucu yoktur. Kendi API anahtarınızı şu sağlayıcılardan biriyle kullanırsınız:
• OpenAI (gpt-4o-mini)
• Google Gemini (gemini-2.5-flash)
• DeepSeek (deepseek-chat)
• Anthropic Claude (claude-haiku-4-5)

Toplu sorgu ve 30 günlük önbellek sayesinde tipik kullanım günde en fazla birkaç düzine küçük API çağrısına mal olur — ilk günlerden sonra neredeyse sıfıra iner.

🔒 GÜVENLİK VE GİZLİLİK — TASARIM GEREĞİ
• API anahtarınız YALNIZCA tarayıcınızda saklanır (chrome.storage.local). Asla senkronize edilmez, kaydedilmez, paylaşılmaz.
• Anahtar, yalnızca SİZİN seçtiğiniz sağlayıcının resmi API'sine HTTPS üzerinden gönderilir.
• Arka uç sunucu yoktur. Geliştirici hiçbir veri almaz — geçmiş yok, sayfa yok, anahtar yok.
• Yapay zekâya üçüncü taraf ALAN ADLARI ve site başına bir kez, sayfanın sadeleştirilmiş yapısal özeti (script/stil çıkarılmış, metinler kısaltılmış) gönderilir — YALNIZCA sizin yapılandırdığınız sağlayıcıya, asla geliştiriciye değil. Formlar, parolalar ve kişisel veriler hedeflenmez.
• %100 açık kaynak. Her satırı denetleyin: https://github.com/cememir/aidblock

📊 SADELİK ESASTIR
Tek açma/kapama düğmesi, canlı istatistikler, sağ tık ile öğe engelleme, siteye özel yeniden tarama butonu ve API anahtarı için ayarlar sayfası. Filtre listesi yönetimi yok, abonelik yok.

API anahtarınız yok mu? Sentinel dahili engel listesiyle tamamen çevrimdışı da çalışır.
```

### Tek amaç açıklaması (Privacy sekmesi)

```
Sentinel reklam ve izleme isteklerini engeller. Bilinen reklam ağları için dahili bir engel listesi, bilinmeyen reklam/izleme alan adlarını tespit edip engellemek ve artakalan reklam kutularını gizlemek için ise (kullanıcının kendi API anahtarıyla çalışan) bir yapay zekâ sınıflandırıcısı kullanır.
```

### İzin gerekçeleri (Privacy sekmesi)

| İzin | Gerekçe |
|---|---|
| `declarativeNetRequest` | Temel engelleme mekanizması: bilinen ağlar için statik, AI'ın reklam saydığı alan adları için dinamik kurallar. Engelleme tarayıcı motorunda yerel olarak yapılır. |
| `webRequest` (gözlemsel) | YALNIZCA istek URL'lerini gözlemlemek için: bilinmeyen üçüncü taraf alan adlarını AI sınıflandırma kuyruğuna almak ve popup istatistikleri için engellenen istekleri saymak. MV3'te istek engelleyemez. |
| `storage` | Kullanıcının API anahtarını, 30 günlük karar önbelleğini, kozmetik filtre önbelleğini ve istatistikleri yerelde saklar. Tekrarlı AI çağrılarını önler. |
| `alarms` | Dakikada bir çalışan alarm, service worker uyutulmuş olsa bile bekleyen sınıflandırma kuyruğunu boşaltır. |
| `contextMenus` | "Sentinel: bu öğeyi reklam olarak engelle" sağ tık menüsünü ekler; kullanıcı görsel onaydan sonra reklamı elle gizleyebilir. |
| Host izni `<all_urls>` | Reklamlar her sitede görünür; eklentinin kullanıcının ziyaret ettiği her sayfada üçüncü taraf istekleri gözlemlemesi ve kozmetik filtre uygulaması gerekir. Sadeleştirilmiş sayfa yapısı özeti yalnızca kullanıcının yapılandırdığı AI sağlayıcısına gönderilir — geliştiriciye asla. |
| Uzak kod | Kullanılmaz. Tüm kod pakettedir; AI API'leri yalnızca JSON verisi döner (block/allow kararları ve CSS seçici metinleri), asla çalıştırılabilir kod dönmez. |

### Veri kullanım beyanları

- Toplanan: **Site içeriği** → Hayır (sadeleştirilmiş sayfa özeti yalnızca kullanıcının kendi anahtarıyla yapılandırdığı AI sağlayıcısına gider; geliştiricinin sunucusu yoktur, hiçbir şey toplamaz). **Gezinme geçmişi** → Hayır (alan adları bellekte işlenir ve yalnızca kullanıcının yapılandırdığı AI sağlayıcısına gönderilir).
- Opsiyonel topluluk özelliği: varsayılan kapalıdır; kullanıcı sunucu adresi girerse yalnızca elle engellenen reklamların alan adı + CSS seçicisi anonim paylaşılır.
- Veriler satılmaz, ilgisiz amaçlarla kullanılmaz, kredibilite değerlendirmesinde kullanılmaz.

---

## Yayın kontrol listesi / Publishing checklist

1. `bash scripts/build.sh` → `dist/sentinel-aidblock-v<tarih-saat>.zip` üretir (sürüm otomatik damgalanır).
2. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → New item → zip'i yükle.
3. Store listing: yukarıdaki EN metinleri + `store/assets/` görselleri. TR çevirisini "Add language → Turkish" ile ekle.
4. Privacy sekmesi: tek amaç açıklaması + izin gerekçeleri + veri beyanları (yukarıda hazır).
5. Privacy policy URL: GitHub'daki `PRIVACY_POLICY.md` linki.
6. Distribution: tüm bölgeler, ücretsiz.
7. Submit for review. (`<all_urls>` + `webRequest` nedeniyle inceleme birkaç gün sürebilir — gerekçeler yukarıda hazır olduğu için sorun beklenmez.)
