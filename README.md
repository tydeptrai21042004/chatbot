# Chatbot App

Single-deployment Next.js app that contains both the frontend UI and backend API routes.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run start
```

## API routes

- `GET /api/health`
- `GET /api/roles`
- `POST /api/chat`
- `GET /api/sessions/:sessionId/messages`

## Required environment variables

Create `.env.local` for local development or set the same variables in Vercel:

- `GEMINI_API_KEY` or `GEMINI_API_KEY_1`
- `GEMINI_API_KEY_2` (optional fallback key)
- `GEMINI_MODEL` (optional, default `gemini-2.5-flash`)
- `GEMINI_THINKING_BUDGET` (optional, default `0`)
- `HELP_NOW_CONTACT_TEXT` (optional custom emergency guidance)
- `NEXT_PUBLIC_API_BASE_URL` (optional; leave empty for same-domain API)

## Notes

- The UI design is preserved from the original frontend.
- Session storage is still in-memory, so history is not durable across cold starts or new server instances.
