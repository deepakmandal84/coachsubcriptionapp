# Coach Subscription SaaS – Database Schema & API Endpoints

## Database Schema (EF Core Entities)

### Tenancy & Auth
- **Coach** (Id PK, TenantId = Id for single-tenant-per-coach): Email, PasswordHash, Name, Role (Coach|Admin), AcademyName, LogoUrl, PrimaryColor, CreatedAt, etc.
- **RefreshToken** (optional): Id, CoachId, Token, ExpiresAt

### Branding (on Coach)
- Stored on Coach: AcademyName, LogoUrl, PrimaryColor. No separate table.

### Students
- **Student**: Id, TenantId (FK → Coach.Id), Name, ParentName, Email, Phone, Notes, Tags (JSON or comma), Status (Active|Inactive), CreatedAt, UpdatedAt

### Packages
- **Package**: Id, TenantId, Name, Price, ValidityDays, TotalSessions? (null = unlimited), Type (ClassPack|MonthlyUnlimited|DropIn), CreatedAt, UpdatedAt

### Subscriptions (student purchase)
- **Subscription**: Id, TenantId, StudentId, PackageId, StartDate, ExpiryDate, RemainingSessions? (null if unlimited), Status (Active|Expired|Cancelled), PaymentStatus (Paid|Due), PaymentMethod (Cash|Zelle|Venmo|Card), CreatedAt, UpdatedAt
- **Payment**: Id, TenantId, SubscriptionId, Amount, PaidAt, Method, Notes, CreatedAt

### Sessions & Attendance
- **Session**: Id, TenantId, Date, Time, Type (Group|Private), Title, Location?, CreatedAt, UpdatedAt
- **Attendance**: Id, SessionId, StudentId, Present (bool), SessionsConsumed (int, default 1). Session has many Attendance; when Present and SessionsConsumed > 0, backend decrements Subscription.RemainingSessions.

### Parent Portal
- **ParentPortalLink**: Id, TenantId, StudentId, SubscriptionId?, TokenHash (hashed token), TokenExpiresAt, CreatedAt

### Notifications
- **MessageLog**: Id, TenantId, Recipient (email or phone), Channel (Email|WhatsApp), TemplateId, Status (Sent|Failed), ProviderMessageId?, SentAt, ErrorMessage?
- **ReminderOptOut** (optional): Id, TenantId, StudentId or Email/Phone, Channel, OptOutAt — to respect opt-out.

### Enums
- PackageType: ClassPack, MonthlyUnlimited, DropIn
- SessionType: Group, Private
- PaymentStatus: Paid, Due
- PaymentMethod: Cash, Zelle, Venmo, Card
- StudentStatus: Active, Inactive
- Role: Coach, Admin

---

## API Endpoints List

### Auth
- POST /api/auth/register (Coach sign up)
- POST /api/auth/login (returns JWT)
- POST /api/auth/forgot-password (optional: send reset email)
- POST /api/auth/refresh (optional)

### Coach (current user)
- GET /api/coach/me — get current coach (branding + profile)
- PUT /api/coach/me — update profile + branding (AcademyName, LogoUrl, PrimaryColor)
- POST /api/coach/me/logo — upload logo (multipart; store locally for dev)

### Students
- GET /api/students — list (filter by status, search)
- GET /api/students/{id}
- POST /api/students
- PUT /api/students/{id}
- DELETE /api/students/{id}

### Packages
- GET /api/packages
- GET /api/packages/{id}
- POST /api/packages
- PUT /api/packages/{id}
- DELETE /api/packages/{id}

### Subscriptions
- GET /api/subscriptions — list (filter by studentId, status)
- GET /api/subscriptions/{id}
- POST /api/subscriptions
- PUT /api/subscriptions/{id} (e.g. mark paid, extend)
- POST /api/subscriptions/{id}/payments — record payment
- POST /api/subscriptions/{id}/send-reminder — send reminder now (email/whatsapp)
- GET /api/subscriptions/{id}/parent-link — create/get parent portal link

### Sessions
- GET /api/sessions — list (filter by date range)
- GET /api/sessions/{id}
- POST /api/sessions
- PUT /api/sessions/{id}
- DELETE /api/sessions/{id}
- GET /api/sessions/{id}/attendance — get attendance for session
- PUT /api/sessions/{id}/attendance — set attendance (present + consume sessions)

### Parent Portal (no JWT; token in URL or header)
- GET /api/parent/{token} — validate token, return student + subscription + branding (for portal view)
- POST /api/parent/{token}/request-renewal — send “request renewal” to coach (email/whatsapp)
- GET /api/parent/link — create link: POST body { studentId, subscriptionId?, expiryDays } → returns full URL (coach only)

### Reports / Dashboard
- GET /api/reports/dashboard — student count, active subs, payments due count, month revenue, expiring soon list

### Admin (platform admin only; no coach data)
- GET /api/admin/coaches — list coaches
- PUT /api/admin/coaches/{id} — enable/disable coach (no student data)

### Message Logs (coach)
- GET /api/message-logs — list sent messages (filter by date, channel)

---

## TenantId Enforcement
- All queries use `TenantId == currentCoachId` from JWT (never from client).
- Get-by-id: fetch by Id AND TenantId; if not found → 404.
- Parent portal: validate token → resolve TenantId from ParentPortalLink → return only that tenant’s branding + student/subscription.
