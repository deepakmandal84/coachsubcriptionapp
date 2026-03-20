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
    }
}
