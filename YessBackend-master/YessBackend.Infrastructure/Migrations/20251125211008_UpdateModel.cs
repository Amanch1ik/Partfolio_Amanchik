using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YessBackend.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class UpdateModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_partner_products_ProductId",
                table: "OrderItems");

            migrationBuilder.AlterColumn<string>(
                name: "DeviceTokens",
                table: "users",
                type: "jsonb",
                nullable: false,
                defaultValue: "[]",
                oldClrType: typeof(string),
                oldType: "jsonb");

            migrationBuilder.AlterColumn<string>(
                name: "WorkingHours",
                table: "PartnerLocations",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true,
                oldClrType: typeof(Dictionary<string, string>),
                oldType: "hstore",
                oldNullable: true);

            migrationBuilder.AlterColumn<double>(
                name: "Longitude",
                table: "PartnerLocations",
                type: "double precision",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(11,8)",
                oldNullable: true);

            migrationBuilder.AlterColumn<double>(
                name: "Latitude",
                table: "PartnerLocations",
                type: "double precision",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(10,8)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "PartnerLocations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Name",
                table: "PartnerLocations",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "PartnerLocations",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<Dictionary<string, string>>(
                name: "WorkingHoursJson",
                table: "PartnerLocations",
                type: "hstore",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "PartnerEmployees",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "PartnerEmployees",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "PartnerEmployees",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "PartnerEmployees",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountPrice",
                table: "partner_products",
                type: "numeric(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "partner_products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsFeatured",
                table: "partner_products",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "DiscountAmount",
                table: "orders",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "LocationId",
                table: "orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "orders",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OriginalAmount",
                table: "orders",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "orders",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "YescoinUsed",
                table: "orders",
                type: "numeric(10,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AlterColumn<string>(
                name: "ProductName",
                table: "OrderItems",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<int>(
                name: "ProductId",
                table: "OrderItems",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.CreateIndex(
                name: "IX_PartnerEmployees_LocationId",
                table: "PartnerEmployees",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_PartnerEmployees_UserId",
                table: "PartnerEmployees",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_partner_products_ProductId",
                table: "OrderItems",
                column: "ProductId",
                principalTable: "partner_products",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PartnerEmployees_PartnerLocations_LocationId",
                table: "PartnerEmployees",
                column: "LocationId",
                principalTable: "PartnerLocations",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_PartnerEmployees_users_UserId",
                table: "PartnerEmployees",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OrderItems_partner_products_ProductId",
                table: "OrderItems");

            migrationBuilder.DropForeignKey(
                name: "FK_PartnerEmployees_PartnerLocations_LocationId",
                table: "PartnerEmployees");

            migrationBuilder.DropForeignKey(
                name: "FK_PartnerEmployees_users_UserId",
                table: "PartnerEmployees");

            migrationBuilder.DropIndex(
                name: "IX_PartnerEmployees_LocationId",
                table: "PartnerEmployees");

            migrationBuilder.DropIndex(
                name: "IX_PartnerEmployees_UserId",
                table: "PartnerEmployees");

            migrationBuilder.DropColumn(
                name: "City",
                table: "PartnerLocations");

            migrationBuilder.DropColumn(
                name: "Name",
                table: "PartnerLocations");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "PartnerLocations");

            migrationBuilder.DropColumn(
                name: "WorkingHoursJson",
                table: "PartnerLocations");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "PartnerEmployees");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "PartnerEmployees");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "PartnerEmployees");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "PartnerEmployees");

            migrationBuilder.DropColumn(
                name: "DiscountPrice",
                table: "partner_products");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "partner_products");

            migrationBuilder.DropColumn(
                name: "IsFeatured",
                table: "partner_products");

            migrationBuilder.DropColumn(
                name: "DiscountAmount",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "LocationId",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "OriginalAmount",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "YescoinUsed",
                table: "orders");

            migrationBuilder.AlterColumn<string>(
                name: "DeviceTokens",
                table: "users",
                type: "jsonb",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "jsonb",
                oldDefaultValue: "[]");

            migrationBuilder.AlterColumn<Dictionary<string, string>>(
                name: "WorkingHours",
                table: "PartnerLocations",
                type: "hstore",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(500)",
                oldMaxLength: 500,
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Longitude",
                table: "PartnerLocations",
                type: "numeric(11,8)",
                nullable: true,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldNullable: true);

            migrationBuilder.AlterColumn<decimal>(
                name: "Latitude",
                table: "PartnerLocations",
                type: "numeric(10,8)",
                nullable: true,
                oldClrType: typeof(double),
                oldType: "double precision",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "ProductName",
                table: "OrderItems",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(200)",
                oldMaxLength: 200,
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ProductId",
                table: "OrderItems",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_OrderItems_partner_products_ProductId",
                table: "OrderItems",
                column: "ProductId",
                principalTable: "partner_products",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
