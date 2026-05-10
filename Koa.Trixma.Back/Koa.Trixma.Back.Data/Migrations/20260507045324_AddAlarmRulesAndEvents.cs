using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    public partial class AddAlarmRulesAndEvents : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "BatteryDischargeRatePctPerHour",
                table: "Units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "BatteryForecastConfidence",
                table: "Units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "BatteryForecastEstimatedAt",
                table: "Units",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "BatteryForecastSegmentStartAt",
                table: "Units",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BatteryForecastStatus",
                table: "Units",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "BatteryPercent",
                table: "Units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "BatteryRemainingHours",
                table: "Units",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "GnssEnabled",
                table: "Units",
                type: "boolean",
                nullable: true);

            // GnssRequestIntervalS and PayloadIntervalS already exist from previous migration

            migrationBuilder.CreateTable(
                name: "AlarmRules",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitId = table.Column<Guid>(type: "uuid", nullable: false),
                    MeasurementType = table.Column<string>(type: "text", nullable: false),
                    Condition = table.Column<int>(type: "integer", nullable: false),
                    Threshold = table.Column<double>(type: "double precision", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Enabled = table.Column<bool>(type: "boolean", nullable: false),
                    CooldownMinutes = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlarmRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlarmRules_Units_UnitId",
                        column: x => x.UnitId,
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AlarmEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AlarmRuleId = table.Column<Guid>(type: "uuid", nullable: false),
                    FiredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActualValue = table.Column<double>(type: "double precision", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlarmEvents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AlarmEvents_AlarmRules_AlarmRuleId",
                        column: x => x.AlarmRuleId,
                        principalTable: "AlarmRules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AlarmEvents_AlarmRuleId",
                table: "AlarmEvents",
                column: "AlarmRuleId");

            migrationBuilder.CreateIndex(
                name: "IX_AlarmRules_UnitId",
                table: "AlarmRules",
                column: "UnitId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlarmEvents");

            migrationBuilder.DropTable(
                name: "AlarmRules");

            migrationBuilder.DropColumn(
                name: "BatteryDischargeRatePctPerHour",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "BatteryForecastConfidence",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "BatteryForecastEstimatedAt",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "BatteryForecastSegmentStartAt",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "BatteryForecastStatus",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "BatteryPercent",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "BatteryRemainingHours",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "GnssEnabled",
                table: "Units");

            // GnssRequestIntervalS and PayloadIntervalS are not dropped as they existed before this migration
        }
    }
}
