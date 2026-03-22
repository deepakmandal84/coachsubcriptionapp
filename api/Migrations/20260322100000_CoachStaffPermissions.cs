using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoachSubscriptionApi.Migrations
{
    [Migration("20260322100000_CoachStaffPermissions")]
    public partial class CoachStaffPermissions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CanCreateSessions",
                table: "coaches",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "CanManageStudents",
                table: "coaches",
                type: "boolean",
                nullable: false,
                defaultValue: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CanCreateSessions",
                table: "coaches");

            migrationBuilder.DropColumn(
                name: "CanManageStudents",
                table: "coaches");
        }
    }
}
