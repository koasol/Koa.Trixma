using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCellLocationToUnit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                    name: "LastCellLatitude",
                table: "Units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                    name: "LastCellLongitude",
                table: "Units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                    name: "LastCellLocationTimestamp",
                table: "Units",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                    name: "LastCellLatitude",
                table: "Units");

            migrationBuilder.DropColumn(
                    name: "LastCellLongitude",
                table: "Units");

            migrationBuilder.DropColumn(
                    name: "LastCellLocationTimestamp",
                table: "Units");
        }
    }
}
