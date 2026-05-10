using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    public partial class RenameCellLocationColumns : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Rename incorrectly named columns from AddCellLocationToUnit migration
            migrationBuilder.Sql("ALTER TABLE \"Units\" RENAME COLUMN \"last_cell_latitude\" TO \"LastCellLatitude\";");
            migrationBuilder.Sql("ALTER TABLE \"Units\" RENAME COLUMN \"last_cell_longitude\" TO \"LastCellLongitude\";");
            migrationBuilder.Sql("ALTER TABLE \"Units\" RENAME COLUMN \"last_cell_location_timestamp\" TO \"LastCellLocationTimestamp\";");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert renames
            migrationBuilder.Sql("ALTER TABLE \"Units\" RENAME COLUMN \"LastCellLatitude\" TO \"last_cell_latitude\";");
            migrationBuilder.Sql("ALTER TABLE \"Units\" RENAME COLUMN \"LastCellLongitude\" TO \"last_cell_longitude\";");
            migrationBuilder.Sql("ALTER TABLE \"Units\" RENAME COLUMN \"LastCellLocationTimestamp\" TO \"last_cell_location_timestamp\";");
        }
    }
}
