using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YessGoFront.Data.Migrations
{
    public partial class AddNotificationFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "data",
                table: "notifications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "delivered_at",
                table: "notifications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "read_at",
                table: "notifications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "scheduled_at",
                table: "notifications",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "sent_at",
                table: "notifications",
                type: "TEXT",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "data",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "delivered_at",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "read_at",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "scheduled_at",
                table: "notifications");

            migrationBuilder.DropColumn(
                name: "sent_at",
                table: "notifications");
        }
    }
}
