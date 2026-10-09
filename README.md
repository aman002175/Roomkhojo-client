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
| `VITE_ADMIN_PATH` (default `/admin-secret-29`) | Admin console (admin JWT) |
| `/about` `/terms` `/refund` | Legal pages |

## Deploy (Vercel)

- Repo connect karo → auto-deploy on push (manual `dist` upload khatam).
- Build-time env vars me `VITE_API_BASE_URL` + `VITE_GOOGLE_CLIENT_ID` (+ optional `VITE_ADMIN_PATH`) set karo. Env badalne par **redeploy zaroori** hai.
- `public/_redirects` Netlify ke liye hai; Vercel par SPA fallback `vercel.json` rewrites se hota hai (direct URL/refresh sab routes par kaam karte hain).
