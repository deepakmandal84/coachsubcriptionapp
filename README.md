# Coach Subscription – MVP Multi-tenant SaaS

Small coaches (kids sports, dance, fitness, tennis, cricket) can manage students, packages, subscriptions, sessions, attendance, payments, and reminders. Parents get a read-only portal via magic link.

## Repo structure

- **api/** – .NET 8 Web API (EF Core, PostgreSQL, JWT, Hangfire, FluentValidation, Serilog)
- **web/** – React (Vite) + TailwindCSS
- **docker/** – Dockerfiles and nginx config
- **docs/** – Schema and API list

## Run locally

### Option A: Docker Compose (all services)

From repo root:

```bash
docker compose up --build
```

- API: http://localhost:5000  
- Swagger: http://localhost:5000/swagger  
- Web (via nginx): http://localhost:80  
- PostgreSQL: localhost:5432 (user `postgres`, password `postgres`, db `coachsub`)

Migrations run on API startup. Seed data is **disabled** in Docker by default. To enable, set `SeedData__Enabled: "true"` for the `api` service in `docker-compose.yml`.

### Option B: Local dev (API + DB in Docker, frontend on Vite)

1. Start Postgres (and optionally API) with Docker:

```bash
docker compose up postgres -d
# optional: docker compose up api -d
```

2. Run migrations (if API not in Docker):

```bash
cd api
dotnet ef database update
# optional: set SeedData:Enabled = true in appsettings.Development.json and run the API once to seed
```

3. Run API (if not using Docker for API):

```bash
cd api
dotnet run
```

4. Run frontend:

```bash
cd web
npm install
npm run dev
```

- Frontend: http://localhost:5173 (proxies /api and /uploads to API)
- API: http://localhost:5000

### Environment variables (API)

| Variable | Description |
|----------|-------------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string |
| `Jwt__Key` | Secret key (min 32 chars) for JWT signing |
| `Jwt__Issuer` / `Jwt__Audience` | Token issuer/audience |
| `Jwt__ExpiresMinutes` | Token lifetime (default 60) |
| `Cors__Origins` | Allowed origins (e.g. `http://localhost:5173`) |
| `Smtp__Host`, `Port`, `User`, `Password`, `From` | SMTP for email reminders (optional) |
| `Twilio__AccountSid`, `AuthToken`, `WhatsAppFrom` | Twilio WhatsApp (optional) |
| `SeedData__Enabled` | Set `true` to seed one demo coach (dev only) |

### Demo login (after seed)

**Coach**
- Email: `coach@demo.local`  
- Password: `Demo123!`

**Super Admin**
- Email: `admin@demo.local`  
- Password: `Admin123!`

---

## Deployment (Railway / Render)

### Railway

1. **Postgres**: Create a PostgreSQL service; note the connection URL.
2. **API**: New Web Service from repo; root directory: `api` (or use `docker/Dockerfile.api` with build context = repo root). Set env:
   - `ConnectionStrings__DefaultConnection` = Postgres URL
   - `Jwt__Key` = strong secret
   - `Cors__Origins` = your frontend URL (e.g. `https://your-app.railway.app`)
3. **Web**: New Web Service; build: `docker/Dockerfile.web` (context = repo root), or build with Node and `npm run build`, then serve the `web/dist` folder. Set root URL to your API (e.g. via env `VITE_API_URL` at build time if you use absolute API URL).

For Hangfire (reminder job), ensure the same process runs the API and Hangfire server (default). Use the same Postgres URL for Hangfire storage.

### Render

1. **PostgreSQL**: Create a PostgreSQL database; copy Internal/External URL.
2. **Web Service (API)**:
   - Build: `dotnet publish api/CoachSubscriptionApi.csproj -c Release -o out`
   - Start: `dotnet out/CoachSubscriptionApi.dll`
   - Env: same as above; add `ASPNETCORE_URLS=http://0.0.0.0:10000` if needed.
3. **Static Site (Web)**:
   - Build: `cd web && npm ci && npm run build`
   - Publish: `web/dist`
   - Redirects: SPA fallback to `index.html` for all routes.

Point `Cors__Origins` to the Render static site URL. For parent portal links, ensure the API base URL (e.g. `https://your-api.onrender.com`) is what you use when generating links.

---

## Production hardening checklist

- [ ] **HTTPS**: Use TLS for API and web (Railway/Render provide it).
- [ ] **Secrets**: Store JWT key, DB URL, SMTP, Twilio in env/secrets; never commit.
- [ ] **Backups**: Enable automated Postgres backups (Railway/Render or your provider).
- [ ] **Logo storage**: Replace local `uploads/` with S3-compatible storage; keep the same `LogoUrl` abstraction.
- [ ] **Rate limiting**: Add rate limiting middleware on auth and public endpoints.
- [ ] **Audit logs**: Log sensitive actions (e.g. login, payment recorded) for compliance.
- [ ] **Hangfire dashboard**: Restrict `/hangfire` to authenticated admins; disable or protect in production.
