using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Data;

public static class SeedData
{
    public static async Task SeedAsync(this AppDbContext db, IConfiguration config, CancellationToken ct = default)
    {
        if (!config.GetValue<bool>("SeedData:Enabled")) return;
        if (await db.Coaches.IgnoreQueryFilters().AnyAsync(ct)) return;

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
            PrimaryColor = "#2563eb",
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
