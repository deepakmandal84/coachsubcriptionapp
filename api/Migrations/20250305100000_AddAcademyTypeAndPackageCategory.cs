using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoachSubscriptionApi.Migrations
{
    [Migration("20250305100000_AddAcademyTypeAndPackageCategory")]
    public partial class AddAcademyTypeAndPackageCategory : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AcademyType",
                table: "coaches",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "packages",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "AcademyType", table: "coaches");
            migrationBuilder.DropColumn(name: "Category", table: "packages");
        }
    }
}
