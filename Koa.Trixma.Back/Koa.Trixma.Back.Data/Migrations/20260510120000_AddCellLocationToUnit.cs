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
                name: "last_cell_latitude",
                table: "units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "last_cell_longitude",
                table: "units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_cell_location_timestamp",
                table: "units",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "last_cell_latitude",
                table: "units");

            migrationBuilder.DropColumn(
                name: "last_cell_longitude",
                table: "units");

            migrationBuilder.DropColumn(
                name: "last_cell_location_timestamp",
                table: "units");
        }
    }
}
