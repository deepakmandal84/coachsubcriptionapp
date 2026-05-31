using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

/// <summary>
/// Deactivates students (soft off roster), purges operational data, and can reactivate later.
/// Profile fields on the student row are kept for rejoin.
/// </summary>
public static class StudentLifecycleService
{
    public static async Task PurgeRelatedDataAsync(AppDbContext db, Guid studentId, CancellationToken ct = default)
    {
        await db.RenewalTransactions.Where(t => t.StudentId == studentId).ExecuteDeleteAsync(ct);
        await db.RenewalRequests.Where(r => r.StudentId == studentId).ExecuteDeleteAsync(ct);

        var subscriptionIds = await db.Subscriptions
            .Where(s => s.StudentId == studentId)
            .Select(s => s.Id)
            .ToListAsync(ct);
        if (subscriptionIds.Count > 0)
            await db.Payments.Where(p => subscriptionIds.Contains(p.SubscriptionId)).ExecuteDeleteAsync(ct);

        await db.ParentPortalLinks.Where(l => l.StudentId == studentId).ExecuteDeleteAsync(ct);
        await db.Subscriptions.Where(s => s.StudentId == studentId).ExecuteDeleteAsync(ct);
        await db.Attendances.Where(a => a.StudentId == studentId).ExecuteDeleteAsync(ct);
        await db.SessionBookings.Where(b => b.StudentId == studentId).ExecuteDeleteAsync(ct);
        await db.ProgressCheckIns.Where(p => p.StudentId == studentId).ExecuteDeleteAsync(ct);
    }

    public static async Task<Student?> DeactivateAsync(AppDbContext db, Guid tenantId, Guid studentId, CancellationToken ct = default)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == studentId && s.TenantId == tenantId, ct);
        if (student == null || student.Status == StudentStatus.Inactive)
            return student;

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            await PurgeRelatedDataAsync(db, studentId, ct);
            student.Status = StudentStatus.Inactive;
            student.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return student;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public static async Task<Student?> ReactivateAsync(AppDbContext db, Guid tenantId, Guid studentId, CancellationToken ct = default)
    {
        var student = await db.Students.FirstOrDefaultAsync(s => s.Id == studentId && s.TenantId == tenantId, ct);
        if (student == null || student.Status != StudentStatus.Inactive)
            return student;

        student.Status = StudentStatus.Active;
        student.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return student;
    }
}
