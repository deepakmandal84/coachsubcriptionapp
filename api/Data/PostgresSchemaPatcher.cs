using Microsoft.EntityFrameworkCore;

namespace CoachSubscriptionApi.Data;

/// <summary>
/// Repairs schema drift when EF history says migrations are applied but columns/tables are missing
/// (e.g. manual DB copy, failed partial migration, or EnsureCreated from an older model).
/// </summary>
public static class PostgresSchemaPatcher
{
    public static async Task EnsureSessionBookingSchemaAsync(AppDbContext db, CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE coaches ADD COLUMN IF NOT EXISTS "ScheduleShareToken" character varying(64) NULL;
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_coaches_ScheduleShareToken" ON coaches ("ScheduleShareToken");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS sessionbookings (
                "Id" uuid NOT NULL,
                "TenantId" uuid NOT NULL,
                "SessionId" uuid NOT NULL,
                "StudentId" uuid NOT NULL,
                "CreatedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_sessionbookings" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_sessionbookings_sessions_SessionId" FOREIGN KEY ("SessionId") REFERENCES sessions ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_sessionbookings_students_StudentId" FOREIGN KEY ("StudentId") REFERENCES students ("Id") ON DELETE RESTRICT
            );
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_sessionbookings_SessionId_StudentId" ON sessionbookings ("SessionId", "StudentId");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_sessionbookings_StudentId" ON sessionbookings ("StudentId");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            VALUES ('20260320120000_SessionBookingsAndScheduleShare', '8.0.11')
            ON CONFLICT ("MigrationId") DO NOTHING;
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS renewalrequests (
                "Id" uuid NOT NULL,
                "TenantId" uuid NOT NULL,
                "StudentId" uuid NOT NULL,
                "SubscriptionId" uuid NULL,
                "Status" integer NOT NULL,
                "RequestedAt" timestamp with time zone NOT NULL,
                "ConfirmedAt" timestamp with time zone NULL,
                CONSTRAINT "PK_renewalrequests" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_renewalrequests_students_StudentId" FOREIGN KEY ("StudentId") REFERENCES students ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_renewalrequests_subscriptions_SubscriptionId" FOREIGN KEY ("SubscriptionId") REFERENCES subscriptions ("Id") ON DELETE SET NULL
            );
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_renewalrequests_TenantId_StudentId_Status" ON renewalrequests ("TenantId", "StudentId", "Status");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_renewalrequests_TenantId_SubscriptionId_Status" ON renewalrequests ("TenantId", "SubscriptionId", "Status");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS renewaltransactions (
                "Id" uuid NOT NULL,
                "TenantId" uuid NOT NULL,
                "StudentId" uuid NOT NULL,
                "SubscriptionId" uuid NULL,
                "RenewalRequestId" uuid NOT NULL,
                "RequestedAt" timestamp with time zone NOT NULL,
                "ConfirmedAt" timestamp with time zone NOT NULL,
                CONSTRAINT "PK_renewaltransactions" PRIMARY KEY ("Id"),
                CONSTRAINT "FK_renewaltransactions_students_StudentId" FOREIGN KEY ("StudentId") REFERENCES students ("Id") ON DELETE RESTRICT,
                CONSTRAINT "FK_renewaltransactions_subscriptions_SubscriptionId" FOREIGN KEY ("SubscriptionId") REFERENCES subscriptions ("Id") ON DELETE SET NULL,
                CONSTRAINT "FK_renewaltransactions_renewalrequests_RenewalRequestId" FOREIGN KEY ("RenewalRequestId") REFERENCES renewalrequests ("Id") ON DELETE RESTRICT
            );
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_renewaltransactions_TenantId_StudentId_ConfirmedAt" ON renewaltransactions ("TenantId", "StudentId", "ConfirmedAt");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE coaches ADD COLUMN IF NOT EXISTS "ClubTenantId" uuid NULL;
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_coaches_ClubTenantId" ON coaches ("ClubTenantId");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_coaches_coaches_ClubTenantId') THEN
                    ALTER TABLE coaches ADD CONSTRAINT "FK_coaches_coaches_ClubTenantId"
                        FOREIGN KEY ("ClubTenantId") REFERENCES coaches ("Id") ON DELETE RESTRICT;
                END IF;
            END $$;
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE TABLE IF NOT EXISTS sessioncoaches (
                "SessionId" uuid NOT NULL,
                "CoachId" uuid NOT NULL,
                CONSTRAINT "PK_sessioncoaches" PRIMARY KEY ("SessionId", "CoachId"),
                CONSTRAINT "FK_sessioncoaches_sessions_SessionId" FOREIGN KEY ("SessionId") REFERENCES sessions ("Id") ON DELETE CASCADE,
                CONSTRAINT "FK_sessioncoaches_coaches_CoachId" FOREIGN KEY ("CoachId") REFERENCES coaches ("Id") ON DELETE RESTRICT
            );
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            CREATE INDEX IF NOT EXISTS "IX_sessioncoaches_CoachId" ON sessioncoaches ("CoachId");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO sessioncoaches ("SessionId", "CoachId")
            SELECT s."Id", s."TenantId" FROM sessions s
            WHERE NOT EXISTS (SELECT 1 FROM sessioncoaches sc WHERE sc."SessionId" = s."Id");
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            VALUES ('20260321120000_SessionCoachesAndClubTenant', '8.0.11')
            ON CONFLICT ("MigrationId") DO NOTHING;
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE coaches ADD COLUMN IF NOT EXISTS "CanCreateSessions" boolean NOT NULL DEFAULT true;
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            ALTER TABLE coaches ADD COLUMN IF NOT EXISTS "CanManageStudents" boolean NOT NULL DEFAULT true;
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
            VALUES ('20260322100000_CoachStaffPermissions', '8.0.11')
            ON CONFLICT ("MigrationId") DO NOTHING;
            """,
            cancellationToken: ct);
    }
}
