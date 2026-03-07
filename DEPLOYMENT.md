# Pre-Deployment Checklist & Environment Variables

Use this list when configuring **Render** (backend) and **Vercel** (frontend).

---

## Render (Backend) – Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Auto-set by Render | Do not set manually; Render injects this. |
| `DATABASE` or `MONGODB_URI` | **Yes** | MongoDB Atlas connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority`). |
| `JWT_SECRET` | **Yes** | Secret key for signing JWTs (use a long random string). |
| `NODE_ENV` | Recommended | Set to `production` on Render. |
| `CORS_ORIGIN` | Optional | Allowed frontend origin(s). Examples: `https://your-app.vercel.app` or `*` (no credentials). Leave unset to reflect request origin (good for Phase 1). |
| `OPENAI_API_KEY` | If using OpenAI | OpenAI API key for AI features. |
| `GEMINI_API_KEY` | If using Gemini | Google Gemini API key (see `aiController.js`). |
| `RESEND_API` | If using email | Resend API key for password reset emails. |
| `PUBLIC_SERVER_FILE` | Optional | Public base URL for assets (e.g. company logo in PDFs). |
| `DO_SPACES_SECRET` | If using DO Spaces | DigitalOcean Spaces secret key. |
| `DO_SPACES_KEY` | If using DO Spaces | DigitalOcean Spaces access key. |
| `DO_SPACES_URL` | If using DO Spaces | Spaces endpoint host (e.g. `nyc3.digitaloceanspaces.com`). |
| `DO_SPACES_NAME` | If using DO Spaces | Bucket name. |
| `REGION` | If using DO Spaces | Region (e.g. `nyc3`). |

---

## Vercel (Frontend) – Environment Variables

Set these in the Vercel project **Environment Variables** (apply to **Production** and optionally Preview).

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_BACKEND_URL` or `VITE_BACKEND_SERVER` | **Yes** (Production) | Backend base URL with trailing slash, e.g. `https://your-backend.onrender.com/`. Used for API and download URLs. |
| `VITE_WEBSITE_URL` | Optional | Public URL of this frontend (e.g. `https://your-app.vercel.app/`). Used for links in emails etc. Defaults to a placeholder if unset. |
| `VITE_FILE_BASE_URL` | Optional | Base URL for user-uploaded files (e.g. profile photos). |
| `VITE_DEV_REMOTE` | Optional | Set to `remote` only when running `npm run dev` against a remote backend; leave unset for normal production build. |

**Note:** All Vite env vars must be prefixed with `VITE_` to be embedded in the client build. After changing them in Vercel, trigger a new deployment.

---

## Quick copy-paste (minimal)

**Render**

```
DATABASE=<your-mongodb-atlas-uri>
JWT_SECRET=<your-long-random-secret>
NODE_ENV=production
```

**Vercel**

```
VITE_BACKEND_URL=https://<your-render-service>.onrender.com/
VITE_WEBSITE_URL=https://<your-vercel-app>.vercel.app/
```

Replace `<your-mongodb-atlas-uri>`, `<your-long-random-secret>`, `<your-render-service>`, and `<your-vercel-app>` with your actual values.

---

## Pre-deployment audit summary

Last audit: backend and frontend scanned for Render + Vercel readiness.

### Task 1: Backend (Render)

| Check | Status | Details |
|-------|--------|---------|
| **Port binding** | OK | `backend/src/server.js` uses `app.set('port', process.env.PORT \|\| 8888)` and `app.listen(app.get('port'), ...)`. Render’s `PORT` is used when set. |
| **CORS** | OK | `backend/src/app.js` uses `CORS_ORIGIN` env: unset → reflect origin; `*` or comma-separated list supported. No hardcoded localhost. |
| **Start script** | OK | `backend/package.json` has `"start": "node src/server.js"` for Render. |

### Task 2: Frontend (Vercel)

| Check | Status | Details |
|-------|--------|---------|
| **Dynamic API URL** | OK | `frontend/src/config/serverApiConfig.js` uses `VITE_BACKEND_URL` / `VITE_BACKEND_SERVER`; localhost only when not production and not `VITE_DEV_REMOTE=remote`. |
| **Request layer** | OK | `frontend/src/request/request.js` uses `API_BASE_URL` from config; no hardcoded localhost. |
| **Build script** | OK | `frontend/package.json` has `"build": "vite build"` for Vercel. |
| **SPA routing** | OK | `frontend/vercel.json` has `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` to avoid 404 on refresh. |

### Task 3: Security & .env

| Check | Status | Details |
|-------|--------|---------|
| **Root .gitignore** | OK | `.env`, `.env.*` ignored; `.env.example` allowed. |
| **backend/.gitignore** | OK | `.env`, `.env.local` ignored. |
| **frontend/.gitignore** | OK | `.env`, `.env.local`, `.env.*.local` ignored. |

**Action before first deploy:** Set `VITE_BACKEND_URL` (or `VITE_BACKEND_SERVER`) in Vercel to your Render backend URL; otherwise the production build will call the same origin and APIs will 404.
