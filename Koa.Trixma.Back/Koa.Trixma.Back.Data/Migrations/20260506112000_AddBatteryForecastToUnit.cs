using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    public partial class AddBatteryForecastToUnit : Migration
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
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
        }
    }
}
