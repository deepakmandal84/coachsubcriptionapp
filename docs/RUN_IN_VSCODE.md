# Run the App in Visual Studio Code (Local PostgreSQL)

Follow these steps to run the Coach Subscription app with **PostgreSQL installed locally** (no Docker).

---

## Prerequisites

Install these **before** starting:

1. **Visual Studio Code** – [https://code.visualstudio.com/](https://code.visualstudio.com/)
2. **.NET 8 SDK** – [https://dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0)  
   - Check: run `dotnet --version` (should show 8.x).
3. **Node.js 18+** – [https://nodejs.org/](https://nodejs.org/)  
   - Check: run `node --version` and `npm --version`.
4. **PostgreSQL** (installed locally) – [https://www.postgresql.org/download/](https://www.postgresql.org/download/)  
   - Make sure the PostgreSQL **service is running** (e.g. from Services on Windows, or `pg_ctl` / package manager on Mac/Linux).

---

## Step 1: Open the project in VS Code

1. Open VS Code.
2. **File → Open Folder** (or **File → Open** on Windows).
3. Select the project root: **SubscriptionApp** (the folder that contains `api`, `web`, and `docker-compose.yml`).
4. Click **Select Folder**. You should see `api`, `web`, `docker`, and `docs` in the Explorer.

---

## Step 2: Create the database and set the connection string

1. **Create a database** named `coachsub` in PostgreSQL. Use either:
   - **pgAdmin**: right‑click **Databases → Create → Database**, name it `coachsub`.
   - **Command line** (if `psql` is in your PATH):
     ```bash
     psql -U postgres -c "CREATE DATABASE coachsub;"
     ```
     (Use the PostgreSQL user you normally use; often `postgres`.)

2. **Set the connection string** for your local PostgreSQL:
   - Open **`api/appsettings.Development.json`** in VS Code.
   - Update `ConnectionStrings:DefaultConnection` to match your setup. Default is:
     ```json
     "DefaultConnection": "Host=localhost;Port=5432;Database=coachsub;Username=postgres;Password=postgres"
     ```
   - Change **Username** and **Password** if your PostgreSQL user is different (e.g. if you set a different password during install).
   - If PostgreSQL is on a different port, change **Port** (default is `5432`).

   Example if your user is `postgres` and password is `mypassword`:
   ```json
   "DefaultConnection": "Host=localhost;Port=5432;Database=coachsub;Username=postgres;Password=mypassword"
   ```

---

## Step 3: Apply database migrations (first time only)

1. In VS Code, open the **Terminal**: **Terminal → New Terminal** (or **Ctrl+`**).
2. Run:
   ```bash
   cd api
   dotnet ef database update
   ```
3. If you see **"dotnet ef" is not found**, install the EF Core tool once:
   ```bash
   dotnet tool install --global dotnet-ef
   ```
   Then run `dotnet ef database update` again from the `api` folder.

When it finishes, the `coachsub` database will have all tables created.

---

## Step 4: Run the API

1. In the same terminal (or a **new terminal**), run:
   ```bash
   cd api
   dotnet run
   ```
2. Wait until you see something like: **Now listening on: http://localhost:5000**.
3. Leave this terminal **running**.

On first run, the app will seed a demo coach and a super admin (because `SeedData:Enabled` is true in `appsettings.Development.json`).

---

## Step 5: Run the frontend (web app)

1. Open a **new terminal** in VS Code: **Terminal → New Terminal**.
2. Install dependencies (first time only):
   ```bash
   cd web
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Wait until you see something like: **Local: http://localhost:5173/**.
5. Leave this terminal **running**.

---

## Step 6: Open the app in the browser

1. In your browser go to: **http://localhost:5173**
2. You should see the Coach Subscription login page.

**Demo logins** (after seed has run):

| Role          | Email              | Password   |
|---------------|--------------------|------------|
| Coach         | `coach@demo.local` | `Demo123!` |
| Super Admin   | `admin@demo.local` | `Admin123!` |

---

## Summary: what’s running

| Thing        | URL / Location        | What to do                    |
|-------------|------------------------|-------------------------------|
| PostgreSQL  | localhost:5432         | Use your local PostgreSQL     |
| API         | http://localhost:5000 | Terminal: `cd api` → `dotnet run` |
| Web app     | http://localhost:5173 | Terminal: `cd web` → `npm run dev` |

---

## Stopping the app

1. In each terminal where the API or frontend is running, press **Ctrl+C**.
2. PostgreSQL keeps running as a normal service; no extra step needed.

---

## Troubleshooting

- **“Cannot connect to database” / “Connection refused”**  
  - Ensure the **PostgreSQL service is running** (e.g. Windows: Services → postgresql-x64-16; Mac: `brew services list`).  
  - Check **Host**, **Port**, **Username**, **Password**, and **Database** in `api/appsettings.Development.json`.  
  - Test from command line: `psql -U postgres -d coachsub -h localhost -p 5432`.

- **“database coachsub does not exist”**  
  - Create the database (Step 2). Then run `dotnet ef database update` again from the `api` folder.

- **“Port 5000 already in use”**  
  - Stop the other process using port 5000, or run the API on another port:  
    `dotnet run --urls "http://localhost:5001"`  
    Then in **`web/vite.config.js`**, change the proxy target to `http://localhost:5001`.

- **“Port 5173 already in use”**  
  - Use the URL Vite prints (e.g. http://localhost:5174).

- **No demo users / empty data**  
  - Run migrations: `cd api` → `dotnet ef database update`.  
  - Ensure **SeedData:Enabled** is **true** in `api/appsettings.Development.json`, then run the API again.

- **API calls from the web app fail**  
  - Ensure the API is running and the port in **`web/vite.config.js`** (proxy target) matches the API port (default 5000).

---

## If you use Docker for PostgreSQL instead

If you later want to use Docker for the database only:

1. From the project root run: `docker compose up postgres -d`
2. Keep using the same connection string in `appsettings.Development.json` (Host=localhost, Port=5432, Database=coachsub, Username=postgres, Password=postgres) if you don’t change `docker-compose.yml`.
3. Run `dotnet ef database update` and then `dotnet run` as in Steps 3 and 4.
