# AI Domain

The AI Domain routes model calls through OpenRouter by default and exposes OpenAI OAuth support for account connection flows.

## Provider configuration

- Primary provider: OpenRouter
- API base URL: `https://openrouter.ai/api/v1`
- Chat completions URL: `https://openrouter.ai/api/v1/chat/completions`
- API key env var: `OPENROUTER_API_KEY`
- Optional attribution env vars: `OPENROUTER_SITE_URL`, `OPENROUTER_APP_TITLE`

## Model/provider mappings

All application model use cases map to provider `openrouter`.

- `default`: `openrouter/auto`
- `job_fit_scoring`: `openrouter/auto`
- `structured_extraction`: `openrouter/auto`
- `reasoning`: `~openai/gpt-latest`
- `resume_generation`: `~openai/gpt-latest`
- `cover_letter_generation`: `~openai/gpt-latest`
- `recruiter_message`: `~openai/gpt-latest`

## OpenAI OAuth

OpenAI OAuth is supported through the current OpenAI issuer metadata:

- Issuer: `https://auth.openai.com`
- Authorization endpoint: `https://auth.openai.com/api/accounts/authorize`
- Token endpoint: `https://auth.openai.com/api/accounts/oauth/token`
- UserInfo endpoint: `https://auth.openai.com/api/accounts/oauth/userinfo`
- PKCE method: `S256`

Required env var: `OPENAI_OAUTH_CLIENT_ID`.

Optional env vars: `OPENAI_OAUTH_CLIENT_SECRET`, `OPENAI_OAUTH_REDIRECT_URI`, `OPENAI_OAUTH_SCOPES`.

The web app exposes `/api/ai/config`, `/api/ai/openai/oauth/authorize`, and `/api/ai/openai/oauth/callback` for configuration discovery and OAuth flow handling.
