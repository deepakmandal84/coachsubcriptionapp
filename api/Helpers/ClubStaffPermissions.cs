using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;

namespace CoachSubscriptionApi.Helpers;

public static class ClubStaffPermissions
{
    public static bool IsClubOwner(ICurrentTenantService t)
        => t.UserId != null && t.TenantId != null && t.UserId == t.TenantId;

    public static async Task<bool> CanCreateSessionsAsync(AppDbContext db, ICurrentTenantService t, CancellationToken ct)
    {
        if (t.TenantId == null || t.UserId == null) return false;
        if (IsClubOwner(t)) return true;
        var c = await db.Coaches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == t.UserId.Value, ct);
        return c is { IsActive: true, CanCreateSessions: true };
    }

    public static async Task<bool> CanManageStudentsAsync(AppDbContext db, ICurrentTenantService t, CancellationToken ct)
    {
        if (t.TenantId == null || t.UserId == null) return false;
        if (IsClubOwner(t)) return true;
        var c = await db.Coaches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == t.UserId.Value, ct);
        return c is { IsActive: true, CanManageStudents: true };
    }
}
