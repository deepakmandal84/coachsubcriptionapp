using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Hangfire.Dashboard;
using Hangfire.PostgreSql;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Serilog;
using CoachSubscriptionApi;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Jobs;
using CoachSubscriptionApi.Services;
using CoachSubscriptionApi.Services.Notifications;

var builder = WebApplication.CreateBuilder(args);

// Ensure coachsub exists, then apply migrations immediately (same connection, before Hangfire)
var connStr = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrEmpty(connStr))
    throw new InvalidOperationException("Connection string 'DefaultConnection' is not set.");

var b = new NpgsqlConnectionStringBuilder(connStr);
var dbName = b.Database ?? "coachsub";
b.Database = "postgres";
try
{
    await using (var conn = new NpgsqlConnection(b.ConnectionString))
    {
        await conn.OpenAsync();
        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1 FROM pg_database WHERE datname = @name";
        cmd.Parameters.AddWithValue("name", dbName);
        var exists = await cmd.ExecuteScalarAsync();
        if (exists == null || exists is DBNull)
        {
            await using var createCmd = conn.CreateCommand();
            createCmd.CommandText = $"CREATE DATABASE \"{dbName.Replace("\"", "\"\"")}\"";
            await createCmd.ExecuteNonQueryAsync();
            Console.WriteLine($"Database '{dbName}' created.");
        }
    }

    // Apply migrations and seed in the same scope so they use the same database connection
    var migrationServices = new ServiceCollection();
    migrationServices.AddScoped<ICurrentTenantService, CurrentTenantService>();
    migrationServices.AddDbContext<AppDbContext>(opts => opts.UseNpgsql(connStr));
#pragma warning disable ASP0000 // BuildServiceProvider from application code
    using (var migrationProvider = migrationServices.BuildServiceProvider())
#pragma warning restore ASP0000
    {
        using var scope = migrationProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Console.WriteLine("Applying migrations...");
        await db.Database.MigrateAsync();
        Console.WriteLine("Migrations applied.");
        await PostgresSchemaPatcher.EnsureSessionBookingSchemaAsync(db);

        // Seed using the same DbContext (same connection)
        try
        {
            await db.SeedAsync(builder.Configuration);
        }
        catch (PostgresException ex) when (ex.SqlState == "42P01")
        {
            // Tables missing (e.g. old __EFMigrationsHistory). Create schema from model and record migrations.
            Console.WriteLine("Tables missing, creating schema...");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS \"__EFMigrationsHistory\"");
            await db.Database.ExecuteSqlRawAsync("DROP TABLE IF EXISTS __efmigrationshistory");
            using var retryScope = migrationProvider.CreateScope();
            var dbRetry = retryScope.ServiceProvider.GetRequiredService<AppDbContext>();
            await dbRetry.Database.EnsureCreatedAsync();
            // Record migrations so future MigrateAsync() does nothing
            await dbRetry.Database.ExecuteSqlRawAsync(
                "CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\" (\"MigrationId\" varchar(150) NOT NULL PRIMARY KEY, \"ProductVersion\" varchar(32) NOT NULL)");
            await dbRetry.Database.ExecuteSqlRawAsync(
                "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('20250305000000_Initial', '8.0.11') ON CONFLICT (\"MigrationId\") DO NOTHING");
            await dbRetry.Database.ExecuteSqlRawAsync(
                "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('20250305100000_AddAcademyTypeAndPackageCategory', '8.0.11') ON CONFLICT (\"MigrationId\") DO NOTHING");
            await dbRetry.Database.ExecuteSqlRawAsync(
                "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ('20260320120000_SessionBookingsAndScheduleShare', '8.0.11') ON CONFLICT (\"MigrationId\") DO NOTHING");
            await PostgresSchemaPatcher.EnsureSessionBookingSchemaAsync(dbRetry);
            await dbRetry.SeedAsync(builder.Configuration);
        }
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Database setup failed: {ex.Message}");
    throw;
}

builder.Host.UseSerilog((ctx, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console();
});

builder.Services.AddScoped<ICurrentTenantService, CurrentTenantService>();
builder.Services.AddDbContext<AppDbContext>(opts =>
{
    opts.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

var key = builder.Configuration["Jwt:Key"] ?? "dev-key-min-32-chars-long-secret!!";
var keyBytes = Encoding.UTF8.GetBytes(key);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "CoachSubscription",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "CoachSubscription",
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailClient, SmtpEmailClient>();
builder.Services.AddScoped<IEmailSender, SmtpEmailSender>();
builder.Services.AddScoped<IWhatsAppSender, TwilioWhatsAppSender>();
builder.Services.AddScoped<IReminderService, ReminderService>();

builder.Services.AddHangfire(c => c.UsePostgreSqlStorage(opts => opts.UseNpgsqlConnection(builder.Configuration.GetConnectionString("DefaultConnection"))));
builder.Services.AddHangfireServer();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Coach Subscription API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme { In = Microsoft.OpenApi.Models.ParameterLocation.Header, Name = "Authorization", Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement { { new Microsoft.OpenApi.Models.OpenApiSecurityScheme { Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() } });
});

builder.Services.AddCors(opts =>
{
    opts.AddDefaultPolicy(p => p.WithOrigins(builder.Configuration["Cors:Origins"] ?? "http://localhost:5173").AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// Seed already ran in the migration block above (same connection); skip here to avoid duplicate

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseTenantFromJwt();
app.UseStaticFiles();
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions { FileProvider = new PhysicalFileProvider(uploadsPath), RequestPath = "/uploads" });
app.MapControllers();
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Coach Subscription API v1"));
app.UseHangfireDashboard("/hangfire", new DashboardOptions { Authorization = new[] { new HangfireAuthFilter() } });

RecurringJob.AddOrUpdate<ReminderJob>("reminders-daily", j => j.RunAsync(CancellationToken.None), Cron.Daily);

app.Run();

file sealed class HangfireAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context) => true;
}
