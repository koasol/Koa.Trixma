using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Koa.Trixma.Back.Data.Migrations
{
    public partial class AddUnitOwnership : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "OwnedBy",
                table: "Units",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE ""Units"" AS u
                SET ""OwnedBy"" = s.""OwnedBy""
                FROM ""Systems"" AS s
                WHERE u.""SystemId"" = s.""Id"" AND u.""OwnedBy"" IS NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_Units_OwnedBy",
                table: "Units",
                column: "OwnedBy");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Units_OwnedBy",
                table: "Units");

            migrationBuilder.DropColumn(
                name: "OwnedBy",
                table: "Units");
        }
    }
}