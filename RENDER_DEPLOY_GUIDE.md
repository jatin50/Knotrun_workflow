# 🚀 Render Deployment Guide — Knotrun Demo App (Studio)

This guide provides the complete pre-flight checklist and step-by-step instructions to deploy the **Knotrun Workflow Automation Studio** on **Render.com**.

---

## 📋 Pre-Flight Audit Checklist (Completed & Verified)

All cloud and production requirements have been audited and configured in the codebase:

| Check | Status | What Was Configured |
| :--- | :---: | :--- |
| **Prisma Migrations** | ✅ Passed | Added `prisma:deploy` (`prisma migrate deploy`) for non-interactive production migrations on Render. |
| **Prisma Client Generation** | ✅ Passed | Updated backend build script to run `prisma generate` before `tsc` compilation. |
| **Reverse Proxy Trust** | ✅ Passed | Added `app.set("trust proxy", 1)` in Express so HTTPS cookies are recognized behind Render's load balancer. |
| **Cross-Site Cookies** | ✅ Passed | Configured `sameSite: "none"` and `secure: true` in `cookies.ts` so authentication cookies transmit across Render subdomains (`*.onrender.com`). |
| **CORS Configuration** | ✅ Passed | Dynamic origin matching allows any `*.onrender.com` domain and respects `CORS_ORIGIN`. |
| **Redis Resilience** | ✅ Passed | `connection.ts` uses `lazyConnect: true` and graceful fallback; the server boots without crashing even if Redis is still provisioning. |
| **Health Check Endpoint** | ✅ Passed | Dedicated `/health` route returning HTTP 200 and uptime for Render zero-downtime health probes. |
| **Host Binding** | ✅ Passed | Server binds explicitly to `0.0.0.0:${PORT}` for cloud container routing. |
| **SPA Rewrites** | ✅ Passed | Configured `/*` $\rightarrow$ `/index.html` rewrite rule for React Router in `render.yaml`. |
| **API URL Normalization** | ✅ Passed | `axios.ts` strips trailing slashes and handles both cross-origin and same-origin deployments. |

---

## 🛠️ Deployment Methods

You can deploy using either **Method 1 (Automatic Blueprint - Recommended)** or **Method 2 (Manual Dashboard)**.

---

### Method 1: Automatic Blueprint Deployment (1-Click)

The repository includes a ready-to-use [`render.yaml`](./render.yaml) blueprint specification.

1. Push your repository to **GitHub** or **GitLab**.
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** $\rightarrow$ **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically read `render.yaml` and display 3 resources to create:
   - **`knotrun-db`**: Managed PostgreSQL database.
   - **`knotrun-api`**: Node.js Backend Web Service.
   - **`knotrun-studio`**: React Frontend Static Site on Render's Global CDN.
   - **`REDIS_URL` Prompt**: Render will ask you to enter the value for `REDIS_URL`. Simply paste your Upstash Redis connection string (`rediss://...`).
6. Click **Apply**.
7. Render will provision the database, run migrations, build both services, and output your live URLs!

---

### Method 2: Manual Dashboard Setup (Step-by-Step)

If you prefer configuring services manually in the Render UI:

#### Step 1: Create PostgreSQL Database
1. In Render, click **New +** $\rightarrow$ **PostgreSQL**.
2. **Name:** `knotrun-db`
3. **Database:** `knotrun_prod`
4. **User:** `knotrun_user`
5. **Region:** Choose closest to your users (e.g. `Oregon (US West)` or `Frankfurt (EU)`).
6. **Plan:** `Free` (or Starter).
7. Click **Create Database**.
8. Once created, copy the **Internal Database URL** (or External if connecting from outside Render).

---

#### Step 2: Deploy Backend Web Service
1. Click **New +** $\rightarrow$ **Web Service**.
2. Connect your repository.
3. Configure settings:
   - **Name:** `knotrun-api`
   - **Language:** `Node`
   - **Region:** Same as your database.
   - **Branch:** `main` (or your active branch).
   - **Root Directory:** `n8n_workflow/backend` (or `backend` if deploying from subfolder).
   - **Build Command:** `npm install && npm run build`
   - **Pre-Deploy Command:** `npm run prisma:deploy`
   - **Start Command:** `npm run start`
   - **Plan:** `Free` (or Starter).
4. Click **Advanced** $\rightarrow$ **Health Check Path:** `/health`
5. Under **Environment Variables**, add:
   | Key | Value / Source |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Paste your Render PostgreSQL Connection String |
   | `JWT_SECRET` | Generate random 32-byte hex (or click Generate) |
   | `JWT_REFRESH_SECRET` | Generate random 32-byte hex (or click Generate) |
   | `JWT_EXPIRES_IN` | `15m` |
   | `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
   | `CREDENTIALS_ENCRYPTION_KEY` | Generate 64-character hex (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `CORS_ORIGIN` | `*` (or your frontend Render URL once known) |
   | `COOKIE_SAME_SITE` | `none` |
   | `REDIS_URL` | *(Optional)* Upstash Redis connection string `rediss://...` (if using async BullMQ queues) |
6. Click **Create Web Service**.
7. Copy your backend URL (e.g. `https://knotrun-api.onrender.com`).

---

#### Step 3: Deploy Frontend Static Site
1. Click **New +** $\rightarrow$ **Static Site**.
2. Connect your repository.
3. Configure settings:
   - **Name:** `knotrun-studio`
   - **Branch:** `main` (or your active branch).
   - **Root Directory:** `n8n_workflow/frontend` (or `frontend` if deploying from subfolder).
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist/client`
4. Under **Redirects / Rewrites**, add an SPA routing rule:
   - **Type:** `Rewrite`
   - **Source:** `/*`
   - **Destination:** `/index.html`
5. Under **Environment Variables**, add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_URL` | Your backend URL from Step 2 (e.g. `https://knotrun-api.onrender.com`) |
6. Click **Create Static Site**.

---

## 🔍 Verification & Testing Live Deployment

Once Render finishes deploying:

1. **Verify Backend Health:**
   ```bash
   curl https://knotrun-api.onrender.com/health
   # Returns: {"status":"ok","service":"knotrun-studio-backend","uptime":...,"timestamp":...}
   ```

2. **Verify Frontend & Recruiter Demo Mode:**
   - Open `https://knotrun-studio.onrender.com`.
   - The studio will automatically initialize in **Guest Mode** with the pre-loaded **Recruiter Demo Workspace**.
   - Open the workflow canvas, trigger a test execution, and inspect real-time in-memory execution nodes!

---

## 💡 Troubleshooting & Tips

- **Render Free Tier Spin-Down:** Free web services spin down after 15 minutes of inactivity. The first request after a sleep period may take ~30-50 seconds to wake up.
- **Cross-Site Cookies:** Browsers treat `*.onrender.com` as cross-site. The backend has been configured with `sameSite: "none"` and `secure: true` so auth cookies persist seamlessly.
- **Database Connection Pooling:** When scaling on Render or Neon, Prisma utilizes connection pooling automatically.
