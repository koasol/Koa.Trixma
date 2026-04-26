using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    public partial class AddBatteryMvToUnit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BatteryMv",
                table: "Units",
                type: "integer",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BatteryMv",
                table: "Units");
        }
    }
}
