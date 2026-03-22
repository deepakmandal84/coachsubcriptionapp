using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoachSubscriptionApi.Migrations
{
    [Migration("20260323130000_ScheduleShareSlug")]
    public partial class ScheduleShareSlug : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ScheduleShareSlug",
                table: "coaches",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_coaches_ScheduleShareSlug",
                table: "coaches",
                column: "ScheduleShareSlug",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_coaches_ScheduleShareSlug",
                table: "coaches");

            migrationBuilder.DropColumn(
                name: "ScheduleShareSlug",
                table: "coaches");
        }
    }
}
