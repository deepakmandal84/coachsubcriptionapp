using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Data;

public class AppDbContext : DbContext
{
    private readonly ICurrentTenantService _tenant;

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentTenantService tenant) : base(options)
    {
        _tenant = tenant;
    }

    public DbSet<Coach> Coaches => Set<Coach>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<Package> Packages => Set<Package>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<SessionBooking> SessionBookings => Set<SessionBooking>();
    public DbSet<ParentPortalLink> ParentPortalLinks => Set<ParentPortalLink>();
    public DbSet<MessageLog> MessageLogs => Set<MessageLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<Coach>(e =>
        {
            e.ToTable("coaches");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => x.ScheduleShareToken).IsUnique();
        });

        builder.Entity<Student>(e =>
        {
            e.ToTable("students");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Coach).WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.TenantId, x.Email });
        });

        builder.Entity<Package>(e =>
        {
            e.ToTable("packages");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Coach).WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Subscription>(e =>
        {
            e.ToTable("subscriptions");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Coach).WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Student).WithMany(s => s.Subscriptions).HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Package).WithMany(p => p.Subscriptions).HasForeignKey(x => x.PackageId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Payment>(e =>
        {
            e.ToTable("payments");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Subscription).WithMany(s => s.Payments).HasForeignKey(x => x.SubscriptionId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Session>(e =>
        {
            e.ToTable("sessions");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Coach).WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<Attendance>(e =>
        {
            e.ToTable("attendances");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Session).WithMany(s => s.Attendances).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Student).WithMany(s => s.Attendances).HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.SessionId, x.StudentId }).IsUnique();
        });

        builder.Entity<SessionBooking>(e =>
        {
            e.ToTable("sessionbookings");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Session).WithMany(s => s.Bookings).HasForeignKey(x => x.SessionId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Student).WithMany(s => s.SessionBookings).HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.SessionId, x.StudentId }).IsUnique();
        });

        builder.Entity<ParentPortalLink>(e =>
        {
            e.ToTable("parentportallinks");
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Coach).WithMany().HasForeignKey(x => x.TenantId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Student).WithMany(s => s.ParentPortalLinks).HasForeignKey(x => x.StudentId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Subscription).WithMany(s => s.ParentPortalLinks).HasForeignKey(x => x.SubscriptionId).OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<MessageLog>(e =>
        {
            e.ToTable("messagelogs");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.TenantId, x.SentAt });
        });

        // Global query filter: evaluated at query time; _tenant.TenantId is per-request (scoped).
        builder.Entity<Student>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
        builder.Entity<Package>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
        builder.Entity<Subscription>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
        builder.Entity<Payment>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
        builder.Entity<Session>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
        builder.Entity<Attendance>().HasQueryFilter(x => _tenant.TenantId == null || x.Session!.TenantId == _tenant.TenantId);
        builder.Entity<ParentPortalLink>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
        builder.Entity<MessageLog>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
        builder.Entity<SessionBooking>().HasQueryFilter(x => _tenant.TenantId == null || x.TenantId == _tenant.TenantId);
    }
}
