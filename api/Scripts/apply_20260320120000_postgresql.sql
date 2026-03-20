-- Run this against the same Postgres database your API uses (connection string / Docker DB).
-- Safe to re-run: uses IF NOT EXISTS where supported.

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS "ScheduleShareToken" character varying(64) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "IX_coaches_ScheduleShareToken" ON coaches ("ScheduleShareToken");

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

CREATE UNIQUE INDEX IF NOT EXISTS "IX_sessionbookings_SessionId_StudentId" ON sessionbookings ("SessionId", "StudentId");
CREATE INDEX IF NOT EXISTS "IX_sessionbookings_StudentId" ON sessionbookings ("StudentId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260320120000_SessionBookingsAndScheduleShare', '8.0.11')
ON CONFLICT ("MigrationId") DO NOTHING;
