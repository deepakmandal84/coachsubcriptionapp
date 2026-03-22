# Deploy on Railway

This app is one **web service** (API + React UI in `wwwroot`) plus **PostgreSQL**. The UI calls `/api` on the same host, so you do not need a second public URL or CORS wiring for normal browser use.

## 1. Create a project

1. [Railway](https://railway.app) → **New project** → **Deploy from GitHub** (connect the repo with `SubscriptionApp`).
2. Railway should detect `railway.toml` and build with `docker/Dockerfile.railway`.

## 2. Add PostgreSQL

1. In the project → **New** → **Database** → **PostgreSQL**.
2. Open your **API service** (the Docker one) → **Variables**.
3. Click **Add variable** → **Add reference** (or **Variable reference**) and connect:

   - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` from the Postgres service, **or**
   - Use Railway’s `DATABASE_URL` if you prefer (then add a small startup script to map it to `ConnectionStrings__DefaultConnection`; the steps below use discrete vars).

4. **Database connection** — pick one:

   **Option A — `DATABASE_URL` (simplest)**  
   On your **app** service → **Variables** → **New variable** → **Reference variable** (or “Variable reference”).  
   Select the **Postgres** service and choose **`DATABASE_URL`**. The variable name on the app service must be exactly **`DATABASE_URL`** (not `POSTGRES_URL` unless you map it yourself).  
   The API reads this from the **process environment** (your `appsettings.json` is not in the Git/Docker image if it is gitignored, so env vars are required in production).

   **Option B — explicit Npgsql string**  
   **Variable name:** `ConnectionStrings__DefaultConnection`  

   **Value (template):**

   ```text
   Host=${{Postgres.PGHOST}};Port=${{Postgres.PGPORT}};Username=${{Postgres.PGUSER}};Password=${{Postgres.PGPASSWORD}};Database=${{Postgres.PGDATABASE}};SSL Mode=Require
   ```

   Railway’s variable reference UI names the Postgres plugin (e.g. `Postgres`); match your project.

   > Managed Postgres does not allow creating extra databases. Set **`Database__SkipAutoCreate=true`** (see below).

## 3. Required environment variables

Set these on the **same service** that runs the Docker image:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` **(recommended)** | Reference from Postgres → **`DATABASE_URL`**. Also supported: `DATABASE_PRIVATE_URL`, or `PGHOST`+`PGPORT`+`PGUSER`+`PGPASSWORD`+`PGDATABASE`, or `ConnectionStrings__DefaultConnection` (full Npgsql string). |
| `Database__SkipAutoCreate` | `true` — required for Railway Postgres (skip `CREATE DATABASE`). |
| `Jwt__Key` | At least **32 characters**, random secret (e.g. `openssl rand -base64 48`). |
| `Jwt__Issuer` | e.g. `CoachSubscription` |
| `Jwt__Audience` | e.g. `CoachSubscription` |
| `SeedData__Enabled` | `false` for production (optional; avoids re-seeding). |

Optional:

- **`Cors__Origins`** — only needed if you access the API from another origin (e.g. local dev hitting prod API). For the bundled SPA, same-origin requests do not use CORS.
- **SMTP / Twilio** — set `Smtp__*` and `Twilio__*` like in `appsettings.json` if you use email/WhatsApp.

## 4. Public URL

1. Open the web service → **Settings** → **Networking** → **Generate domain** (or attach a custom domain).
2. Your app is served at that URL; `/api/...` and `/swagger` are on the same host.

## 5. First deploy checklist

- [ ] Postgres attached; `DATABASE_URL` referenced **or** `ConnectionStrings__DefaultConnection` set with `SSL Mode=Require`.
- [ ] `Database__SkipAutoCreate=true`
- [ ] Strong `Jwt__Key` (not the dev default)
- [ ] `SeedData__Enabled=false` if you do not want demo seed data

## 6. Local Docker smoke test (optional)

From the **repository root**:

```bash
docker build -f docker/Dockerfile.railway -t coachsub:railway .
docker run --rm -p 8080:8080 -e PORT=8080 ^
  -e Database__SkipAutoCreate=true ^
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;..." ^
  -e Jwt__Key="your-32-plus-char-secret-for-local-test-only" ^
  coachsub:railway
```

Open `http://localhost:8080`.

## Troubleshooting: `Name or service not known` (PostgreSQL)

That error means the **hostname in your connection string does not resolve** (DNS). Common causes on Railway:

1. **Variables not attached to the app service** — Open your **web/API service** → **Variables**. You must **reference** Postgres (`DATABASE_URL` or `PGHOST`, etc.). If `PGHOST` / `DATABASE_URL` is empty or a placeholder, DNS will fail.

2. **Wrong or literal variable text** — If you pasted something like `${{Postgres.PGHOST}}` by hand instead of using **Variable reference**, Railway may not substitute it. Use **Add reference** → pick the Postgres service → pick the variable.

3. **Private URL outside Railway** — URLs with hosts like `*.railway.internal` only resolve **inside** Railway’s network. If you run the API **locally** or in Docker on your PC with a copied `DATABASE_URL`, use **`DATABASE_PUBLIC_URL`** (or the **public** connection string from the Postgres plugin) instead, or only test DB from a deploy on Railway.

4. **Fix** — In the Postgres service on Railway, open **Variables** / **Connect** and copy the **public** URL if needed. On your app service, set **`DATABASE_PUBLIC_URL`** (referenced from Postgres) **or** ensure **`DATABASE_URL`** is the reference Railway generates (not manually mistyped). The app reads `DATABASE_URL`, `DATABASE_PUBLIC_URL`, and `DATABASE_PRIVATE_URL` in that order (first non-empty wins).

After deploy, check logs for: `Database connection host (...): hostname:5432` — if the host looks wrong or empty, fix variables.

## Free tier / credits

Railway’s pricing and free trial change over time; check [Railway pricing](https://railway.app/pricing). A single small service + Postgres is usually enough for this stack; sleep/usage limits may apply on trial plans.
