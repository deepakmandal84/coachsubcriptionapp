# Gmail: send email from the app – step by step

The app uses the built-in **.NET SmtpClient** with your Gmail address and password from config.

## Step 1: Get a Gmail App Password

1. Open **https://myaccount.google.com/security**
2. Under **How you sign in to Google**, turn on **2-Step Verification** if it is off.
3. Go to **App passwords**: https://myaccount.google.com/apppasswords  
   (Or: Security → 2-Step Verification → App passwords.)
4. Click **Select app** → **Mail** (or **Other** and type “Coach App”).
5. Click **Generate**.
6. Copy the **16-character password** (e.g. `abcd efgh ijkl mnop`).  
   You can paste it **with or without spaces** – the app removes spaces.

---

## Step 2: Put your Gmail and App Password in config

1. In your project, open:  
   **`api/appsettings.Development.json`**
2. Find the **`Smtp`** section.
3. Set:
   - **User** = your Gmail address (e.g. `coach.subscription@gmail.com`).
   - **Password** = the 16-character App Password from Step 1.  
     Paste it as-is (e.g. `ubai kbxp lnxa ximw` or `ubaikbxplnxaximw`).
   - **From** = same as **User** (e.g. `coach.subscription@gmail.com`).
4. Save the file.

Example:

```json
"Smtp": {
  "Host": "smtp.gmail.com",
  "Port": "587",
  "UseSsl": "true",
  "User": "coach.subscription@gmail.com",
  "Password": "ubai kbxp lnxa ximw",
  "From": "coach.subscription@gmail.com"
}
```

---

## Step 3: Restart the API

1. In the terminal where the API is running, press **Ctrl+C** to stop it.
2. Start it again:
   ```bash
   cd api
   dotnet run
   ```
3. Wait until you see something like: **Now listening on: http://localhost:5000**

---

## Step 4: Test sending an email

1. Open the app in the browser (e.g. **http://localhost:5173**).
2. Log in as coach: **coach@demo.local** / **Demo123!**
3. Go to **Subscriptions**.
4. Pick a subscription whose **student has an email**.
5. Click **Remind**.
6. You should see the **“Email sent successfully”** dialog.
7. Check that student’s inbox (and spam) for the reminder.

---

## If you still get “Authentication Required”

- Make sure **Password** is the **full** 16-character App Password (all 4 groups). Spaces are removed automatically.
- Make sure **User** and **From** are exactly your Gmail address (no typos, no spaces).
- Try **port 465** instead of 587: set `"Port": "465"` and keep `"UseSsl": "true"`, then restart the API.
- Generate a **new** App Password in Google and paste that into **Password**, then restart the API (Step 3).

**If you see "535 Username and Password not accepted" (BadCredentials):** Gmail is rejecting the credentials. (1) Use an App Password, not your normal Gmail password. (2) Generate a **new** App Password at https://myaccount.google.com/apppasswords (2-Step Verification must be ON), copy all 16 characters, put in **Smtp:Password**, restart API. (3) In the API console when you send, look for a line like `password length 16` – if it says 0 or not 16, the config file is wrong or not being loaded. (4) Edit **api/appsettings.Development.json** (not only appsettings.json), save, restart.
