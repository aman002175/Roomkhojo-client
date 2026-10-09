# RoomKhojo Client (Frontend)

React 19 + Vite + Tailwind + MapLibre. Map-based room/PG finder.

## Setup

```bash
npm install
cp .env.example .env   # values bharo
npm run dev            # http://localhost:5173
```

## Env vars

| Var | Kaam |
|---|---|
| `VITE_API_BASE_URL` | Backend URL + `/api` (e.g. `https://xxx.vercel.app/api`) |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud OAuth Client ID |

## Scripts

- `npm run dev` — local dev
- `npm run build` — production build (`dist/`)
- `npm run lint` — ESLint (clean rakho)

## Routes

| Path | Page |
|---|---|
| `/` | Map + list + post-ad |
| `/dashboard` | User ke ads (login required) |
| `/admin-secret-29` | Admin console (admin JWT) |
| `/about` `/terms` `/refund` | Legal pages |

## Deploy (Vercel)

- Repo connect karo → auto-deploy on push (manual `dist` upload khatam).
- Build-time env vars me `VITE_API_BASE_URL` + `VITE_GOOGLE_CLIENT_ID` set karo.
- `public/_redirects` Netlify ke liye tha; Vercel par SPA fallback automatic hai.
