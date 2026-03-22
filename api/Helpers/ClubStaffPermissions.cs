using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;

namespace CoachSubscriptionApi.Helpers;

public static class ClubStaffPermissions
{
    public static bool IsClubOwner(ICurrentTenantService t)
        => t.UserId != null && t.TenantId != null && t.UserId == t.TenantId;

    /// <summary>Super Admin sent <c>X-Acting-Tenant-Id</c> with a club owner id — may perform owner-level actions for that academy.</summary>
    public static bool IsAdminActingAsTenant(ICurrentTenantService t)
        => t.IsAdmin && t.TenantId != null;

    /// <summary>Club owner, or Super Admin acting as that club (header).</summary>
    public static bool IsClubOwnerOrAdminActing(ICurrentTenantService t)
        => t.TenantId != null && (IsClubOwner(t) || IsAdminActingAsTenant(t));

    public static async Task<bool> CanCreateSessionsAsync(AppDbContext db, ICurrentTenantService t, CancellationToken ct)
    {
        if (t.TenantId == null || t.UserId == null) return false;
        if (IsClubOwner(t) || IsAdminActingAsTenant(t)) return true;
        var c = await db.Coaches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == t.UserId.Value, ct);
        return c is { IsActive: true, CanCreateSessions: true };
    }

    public static async Task<bool> CanManageStudentsAsync(AppDbContext db, ICurrentTenantService t, CancellationToken ct)
    {
        if (t.TenantId == null || t.UserId == null) return false;
        if (IsClubOwner(t) || IsAdminActingAsTenant(t)) return true;
        var c = await db.Coaches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == t.UserId.Value, ct);
        return c is { IsActive: true, CanManageStudents: true };
    }
}
