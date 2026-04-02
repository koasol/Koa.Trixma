using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    public partial class InitialPostgres : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Ensure TimescaleDB extension is available
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS timescaledb;");

            migrationBuilder.CreateTable(
                name: "Systems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    OwnedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Systems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IdentityProviderId = table.Column<string>(type: "text", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    DisplayName = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Units",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    IpAddress = table.Column<string>(type: "text", nullable: true),
                    MacAddress = table.Column<string>(type: "text", nullable: true),
                    SystemId = table.Column<Guid>(type: "uuid", nullable: true),
                    nfcId = table.Column<string>(type: "text", nullable: true),
                    LastProvisionedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Units_Systems_SystemId",
                        column: x => x.SystemId,
                        principalTable: "Systems",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Measurements",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Type = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<double>(type: "double precision", nullable: false),
                    UnitId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Measurements", x => new { x.Id, x.Timestamp });
                    table.ForeignKey(
                        name: "FK_Measurements_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Convert Measurements into a TimescaleDB hypertable on Timestamp
            migrationBuilder.Sql("SELECT create_hypertable('\"Measurements\"', 'Timestamp', if_not_exists => TRUE);");

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_UnitId",
                table: "Measurements",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Measurements_UnitId_Timestamp",
                table: "Measurements",
                columns: new[] { "UnitId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_Units_SystemId",
                table: "Units",
                column: "SystemId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Measurements");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "Units");

            migrationBuilder.DropTable(
                name: "Systems");
        }
    }
}
