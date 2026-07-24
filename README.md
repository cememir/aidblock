# Sentinel — AI AdBlock (Chrome MV3)

Self-learning, AI-powered, zero-config ad blocker.
**100% open source** — no backend, no telemetry, no subscription.

> 🇹🇷 Türkçe dokümantasyon: [README.tr.md](README.tr.md) · Store texts (EN+TR): [`store/STORE_LISTING.md`](store/STORE_LISTING.md) · Privacy: [`PRIVACY_POLICY.md`](PRIVACY_POLICY.md)

## How it works

1. **Instant blocking** — 140+ known ad/tracking networks are blocked by the
   `declarativeNetRequest` rules in `rules_static.json`, natively in the browser engine,
   with no AI call at all.
2. **AI learning** — *Unknown* third-party domains seen on pages are queued and sent
   in batches (15 at a time) to your chosen AI provider with a single question: `block` or `allow`?
3. **Cache** — Every verdict is stored for 30 days in `chrome.storage.local`. When the same
   domain shows up again, **the AI is never called** — the answer comes straight from cache.
4. **Dynamic rules** — Domains classified as ads become dynamic blocking rules; blocking
   happens at the network layer, not in JS (no performance penalty). Rules are
   **third-party only** — a domain is never blocked on its own site.
5. **Cosmetic filtering** — Leftover in-page ad boxes are hidden with site-specific CSS
   selectors generated once by AI and cached per hostname for 7 days. Selectors pass a
   runtime safety check so they can never hide video players or page layout.
6. **Right-click blocking** — Right-click any element → *"Sentinel: block this element as an ad"*.
   The rule is saved per-site and re-applied on every visit.
7. **Community rules (optional)** — Right-click blocks can be shared anonymously
   (hostname + CSS selector only) with a self-hostable community server
   ([`server/main.py`](server/main.py)). Rules reaching a net score of **+3** are applied
   automatically for everyone; lower-scored rules are shown to other users as a
   yes/no vote first. Disabled unless an API URL is set in the settings.

## Supported AI providers

Every user enters **their own API key** (on the settings page):

| Provider | Model | Get a key |
|---|---|---|
| OpenAI | `gpt-4o-mini` | <https://platform.openai.com/api-keys> |
| Google Gemini | `gemini-2.5-flash` | <https://aistudio.google.com/apikey> |
| DeepSeek | `deepseek-chat` | <https://platform.deepseek.com/api_keys> |
| Anthropic Claude | `claude-haiku-4-5` | <https://platform.claude.com/settings/keys> |

Without a key, the extension still works fully offline using its built-in static blocklist.

## Security

- Your API key is stored **only in your browser** (`chrome.storage.local`) — never synced,
  never logged, never shared. There is no backend server; the developers receive no data.
- The key is sent exclusively to the official API of the provider **you** selected, over HTTPS.
- Only third-party **domain names** and anonymous ad-container summaries are sent to the AI —
  never page content, form data or personal information.
- All code lives in this repository and can be audited (MIT license).

## Installation (developer mode)

1. Clone the repo: `git clone https://github.com/cememir/aidblock.git`
2. Chrome → `chrome://extensions` → enable "Developer mode".
3. "Load unpacked" → select this folder.
4. The settings page opens automatically: pick a provider, paste your API key and
   verify it with "Test key".

## Chrome Web Store publishing

- Release package: `bash scripts/build.sh` → `dist/sentinel-aidblock-v<version>.zip`
- Store texts (EN+TR), permission justifications and the publishing checklist:
  [`store/STORE_LISTING.md`](store/STORE_LISTING.md)
- Store assets: `store/assets/` (icon, 3 screenshots, promo images)

## Cost note

Cheap-tier models + batched queries + the 30-day cache keep typical usage to a few dozen
tiny API calls per day at most — dropping to near zero after the first days of browsing.

## Files

| File | Purpose |
|---|---|
| `background.js` | AI providers, classification, queue/batching, cache, dynamic rules, stats |
| `rules_static.json` | Base blocklist (148 rules, no AI, instant) |
| `content.js` | Cosmetic filtering (generic + AI selectors, cached, runtime-safe) |
| `popup.html/js` | Toggle + stats + settings shortcut |
| `options.html/js` | Provider selection + API keys (local storage only) |
| `_locales/` | EN + TR UI strings |
| `store/` | Chrome Web Store texts and assets |
| `scripts/build.sh` | Builds the release zip (date-time versioning) |

## Developers

- **Muslu YÜKSEKTEPE** — <musluyuksektepe@gmail.com>
- **Cem Emir YÜKSEKTEPE** — <cememir2017@gmail.com>

## License

[MIT](LICENSE)
