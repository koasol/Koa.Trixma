using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    public partial class AddFrequencyFieldsToUnit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PayloadIntervalS",
                table: "Units",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "GnssRequestIntervalS",
                table: "Units",
                type: "integer",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PayloadIntervalS",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "GnssRequestIntervalS",
                table: "Units");
        }
    }
}
