# Email configuration

The app sends reminder emails using **Smtp** settings: your email address and password.

---

## Gmail / Outlook

1. In **appsettings.Development.json** (or **appsettings.json**), set under **Smtp**:
   - **User** – your email (e.g. `yourname@gmail.com` or `you@outlook.com`)
   - **Password** – your password or app password
   - **From** – same as User

2. **Gmail:** Use Host `smtp.gmail.com`, Port `587` (or `465`), UseSsl `true`.  
   Gmail may require an [App Password](https://support.google.com/accounts/answer/185833) if “App passwords” is available for your account.

3. **Outlook / Microsoft 365:** Use Host `smtp.office365.com`, Port `587`, UseSsl `true`.  
   User and Password are usually your normal account sign-in.

Example (Gmail):

```json
"Smtp": {
  "Host": "smtp.gmail.com",
  "Port": "587",
  "UseSsl": "true",
  "User": "your-email@gmail.com",
  "Password": "your-password-or-app-password",
  "From": "your-email@gmail.com"
}
```

Do not commit real passwords. Use User Secrets or environment variables in production.
