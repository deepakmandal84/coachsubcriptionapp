using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Data;

public static class SeedData
{
    public static async Task SeedAsync(this AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        var seedDemo = config.GetValue<bool>("SeedData:Enabled");
        var anyCoaches = await db.Coaches.IgnoreQueryFilters().AnyAsync(ct);

        if (seedDemo && !anyCoaches)
        {
            await SeedDemoTenantsAsync(db, ct);
            return;
        }

        await EnsureSuperAdminAsync(db, config, ct);
    }

    /// <summary>
    /// When no <see cref="Role.Admin"/> exists, inserts one so you can log in and use the admin API across academies.
    /// Runs even if demo seed is disabled. Configure via SeedData:SuperAdminEmail / SeedData:SuperAdminPassword (or env SeedData__*).
    /// </summary>
    static async Task EnsureSuperAdminAsync(AppDbContext db, IConfiguration config, CancellationToken ct)
    {
        if (!config.GetValue("SeedData:EnsureSuperAdmin", true)) return;

        if (await db.Coaches.IgnoreQueryFilters().AnyAsync(c => c.Role == Role.Admin, ct))
            return;

        var email = (config["SeedData:SuperAdminEmail"] ?? "admin@demo.local").Trim().ToLowerInvariant();
        var password = config["SeedData:SuperAdminPassword"] ?? "Admin123!";

        if (await db.Coaches.IgnoreQueryFilters().AnyAsync(c => c.Email == email, ct))
        {
            Console.WriteLine(
                $"SeedData: Super Admin not created — email '{email}' is already registered. Promote that user to Admin in the database or set SeedData__SuperAdminEmail to a free address.");
            return;
        }

        db.Coaches.Add(new Coach
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = AuthServiceHash(password),
            Name = "Super Admin",
            Role = Role.Admin,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        });
        await db.SaveChangesAsync(ct);
        Console.WriteLine($"SeedData: Super Admin created ({email}). Change the password after first login in production.");
    }

    static async Task SeedDemoTenantsAsync(AppDbContext db, CancellationToken ct)
    {
        var adminId = Guid.NewGuid();
        var admin = new Coach
        {
            Id = adminId,
            Email = "admin@demo.local",
            PasswordHash = AuthServiceHash("Admin123!"),
            Name = "Super Admin",
            Role = Role.Admin,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        db.Coaches.Add(admin);

        var coachId = Guid.NewGuid();
        var coach = new Coach
        {
            Id = coachId,
            Email = "coach@demo.local",
            PasswordHash = AuthServiceHash("Demo123!"),
            Name = "Demo Coach",
            AcademyName = "Demo Academy",
            PrimaryColor = "#0f766e",
            Role = Role.Coach,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        db.Coaches.Add(coach);

        var s1 = new Student { Id = Guid.NewGuid(), TenantId = coachId, Name = "Alex Smith", ParentName = "Jane Smith", Email = "jane@example.com", Phone = "+15551234567", Status = StudentStatus.Active, CreatedAt = DateTime.UtcNow };
        var s2 = new Student { Id = Guid.NewGuid(), TenantId = coachId, Name = "Sam Jones", ParentName = "Bob Jones", Email = "bob@example.com", Status = StudentStatus.Active, CreatedAt = DateTime.UtcNow };
        db.Students.AddRange(s1, s2);

        var pkg1 = new Package { Id = Guid.NewGuid(), TenantId = coachId, Name = "10 Classes Pack", Price = 120, ValidityDays = 90, TotalSessions = 10, Type = PackageType.ClassPack, CreatedAt = DateTime.UtcNow };
        var pkg2 = new Package { Id = Guid.NewGuid(), TenantId = coachId, Name = "Monthly Unlimited", Price = 80, ValidityDays = 30, TotalSessions = null, Type = PackageType.MonthlyUnlimited, CreatedAt = DateTime.UtcNow };
        db.Packages.AddRange(pkg1, pkg2);

        await db.SaveChangesAsync(ct);

        var start = DateTime.UtcNow.Date;
        var sub1 = new Subscription { Id = Guid.NewGuid(), TenantId = coachId, StudentId = s1.Id, PackageId = pkg1.Id, StartDate = start, ExpiryDate = start.AddDays(90), RemainingSessions = 8, Status = SubscriptionStatus.Active, PaymentStatus = PaymentStatus.Paid, PaymentMethod = PaymentMethod.Cash, CreatedAt = DateTime.UtcNow };
        var sub2 = new Subscription { Id = Guid.NewGuid(), TenantId = coachId, StudentId = s2.Id, PackageId = pkg2.Id, StartDate = start, ExpiryDate = start.AddDays(30), RemainingSessions = null, Status = SubscriptionStatus.Active, PaymentStatus = PaymentStatus.Due, PaymentMethod = PaymentMethod.Zelle, CreatedAt = DateTime.UtcNow };
        db.Subscriptions.AddRange(sub1, sub2);
        await db.SaveChangesAsync(ct);
    }

    private static string AuthServiceHash(string password)
    {
        using var sha = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }
}
