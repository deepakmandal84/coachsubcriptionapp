using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoachSubscriptionApi.Migrations
{
    [Migration("20260320120000_SessionBookingsAndScheduleShare")]
    public partial class SessionBookingsAndScheduleShare : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ScheduleShareToken",
                table: "coaches",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "sessionbookings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sessionbookings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sessionbookings_sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "sessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_sessionbookings_students_StudentId",
                        column: x => x.StudentId,
                        principalTable: "students",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_coaches_ScheduleShareToken",
                table: "coaches",
                column: "ScheduleShareToken",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sessionbookings_SessionId_StudentId",
                table: "sessionbookings",
                columns: new[] { "SessionId", "StudentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_sessionbookings_StudentId",
                table: "sessionbookings",
                column: "StudentId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "sessionbookings");

            migrationBuilder.DropIndex(
                name: "IX_coaches_ScheduleShareToken",
                table: "coaches");

            migrationBuilder.DropColumn(
                name: "ScheduleShareToken",
                table: "coaches");
        }
    }
}
