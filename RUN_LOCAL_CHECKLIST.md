# Run in VS Code – Quick checklist

Use this in **Visual Studio Code** with the **SubscriptionApp** folder open.

---

## Before you start

- [ ] **PostgreSQL** is installed and the service is running.
- [ ] **.NET 8 SDK** is installed (`dotnet --version` shows 8.x).
- [ ] **Node.js 18+** is installed (`node --version`).

---

## Step-by-step

### 1. Open the project

- **File → Open Folder** → select the **SubscriptionApp** folder (the one that has `api`, `web`, `docs`).

---

### 2. Create the database

- Open **pgAdmin** (or any PostgreSQL client).
- Create a new database named: **`coachsub`**.

Or in a terminal (if `psql` is in your PATH):

```bash
psql -U postgres -c "CREATE DATABASE coachsub;"
```

(Use your PostgreSQL username; replace `postgres` if needed.)

---

### 3. Set your PostgreSQL password

- In VS Code, open **`api/appsettings.Development.json`**.
- Set **Password** in the connection string to your real PostgreSQL password. Example:

```json
"DefaultConnection": "Host=localhost;Port=5432;Database=coachsub;Username=postgres;Password=YOUR_PASSWORD_HERE"
```

Save the file.

---

### 4. Open the terminal in VS Code

- **Terminal → New Terminal** (or press **Ctrl+`**).
- Your shell opens at the project root.

---

### 5. Install EF Core tool (first time only)

Run:

```bash
dotnet tool install --global dotnet-ef
```

(If you already have it, you can skip this.)

---

### 6. Run migrations

In the same terminal:

```bash
cd api
dotnet ef database update
```

You should see: **Done.** or **Applying migration...**  
Then go back to the project root:

```bash
cd ..
```

---

### 7. Start the API

Option A – **New terminal** (recommended): **Terminal → New Terminal**, then:

```bash
cd api
dotnet run
```

Option B – Same terminal after migrations:

```bash
cd api
dotnet run
```

Wait until you see: **Now listening on: http://localhost:5000**  
Leave this terminal open.

---

### 8. Start the web app

Open a **new terminal** (**Terminal → New Terminal**), then:

```bash
cd web
npm install
npm run dev
```

Wait until you see: **Local: http://localhost:5173/**  
Leave this terminal open.

---

### 9. Open the app

- In your browser go to: **http://localhost:5173**
- You should see the **Coach Subscription** login page.

**Log in with:**

| Role        | Email               | Password   |
|------------|---------------------|------------|
| Coach      | coach@demo.local    | Demo123!   |
| Super Admin| admin@demo.local    | Admin123!  |

---

## If something fails

- **Database connection error**  
  - Check that PostgreSQL is running.  
  - Check **Password** in `api/appsettings.Development.json`.  
  - Confirm the database **coachsub** exists.

- **`dotnet ef` not found**  
  - Run: `dotnet tool install --global dotnet-ef`  
  - Close and reopen the terminal, then run `dotnet ef database update` again.

- **Port 5000 or 5173 in use**  
  - Stop the other app using that port, or see the full guide in **`docs/RUN_IN_VSCODE.md`** for changing ports.

---

## Stopping the app

- In each terminal where **dotnet run** or **npm run dev** is running, press **Ctrl+C**.
