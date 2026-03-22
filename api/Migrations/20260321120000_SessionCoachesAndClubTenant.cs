using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoachSubscriptionApi.Migrations
{
    [Migration("20260321120000_SessionCoachesAndClubTenant")]
    public partial class SessionCoachesAndClubTenant : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClubTenantId",
                table: "coaches",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "sessioncoaches",
                columns: table => new
                {
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CoachId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sessioncoaches", x => new { x.SessionId, x.CoachId });
                    table.ForeignKey(
                        name: "FK_sessioncoaches_coaches_CoachId",
                        column: x => x.CoachId,
                        principalTable: "coaches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_sessioncoaches_sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_coaches_ClubTenantId",
                table: "coaches",
                column: "ClubTenantId");

            migrationBuilder.CreateIndex(
                name: "IX_sessioncoaches_CoachId",
                table: "sessioncoaches",
                column: "CoachId");

            migrationBuilder.AddForeignKey(
                name: "FK_coaches_coaches_ClubTenantId",
                table: "coaches",
                column: "ClubTenantId",
                principalTable: "coaches",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql(
                """
                INSERT INTO sessioncoaches ("SessionId", "CoachId")
                SELECT s."Id", s."TenantId" FROM sessions s
                WHERE NOT EXISTS (SELECT 1 FROM sessioncoaches sc WHERE sc."SessionId" = s."Id");
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_coaches_coaches_ClubTenantId",
                table: "coaches");

            migrationBuilder.DropTable(
                name: "sessioncoaches");

            migrationBuilder.DropIndex(
                name: "IX_coaches_ClubTenantId",
                table: "coaches");

            migrationBuilder.DropColumn(
                name: "ClubTenantId",
                table: "coaches");
        }
    }
}
