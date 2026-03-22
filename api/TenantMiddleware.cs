using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi;

public static class TenantMiddleware
{
    /// <summary>Super Admin sends the club <i>owner</i> coach id (or staff coach id; resolved to owner tenant) to use tenant-scoped APIs.</summary>
    public const string ActingTenantHeader = "X-Acting-Tenant-Id";

    public static void UseTenantFromJwt(this IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            var tenant = context.RequestServices.GetRequiredService<ICurrentTenantService>();
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier) ?? context.User.FindFirst("sub");
                var emailClaim = context.User.FindFirst(ClaimTypes.Email) ?? context.User.FindFirst("email");
                var roleClaim = context.User.FindFirst(ClaimTypes.Role) ?? context.User.FindFirst("role");
                if (idClaim != null && Guid.TryParse(idClaim.Value, out var userId))
                {
                    var isAdmin = string.Equals(roleClaim?.Value, "Admin", StringComparison.OrdinalIgnoreCase);
                    var email = emailClaim?.Value ?? "";

                    if (isAdmin)
                    {
                        if (context.Request.Headers.TryGetValue(ActingTenantHeader, out var hv)
                            && Guid.TryParse(hv.FirstOrDefault(), out var requestedId))
                        {
                            using var scope = context.RequestServices.CreateScope();
                            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                            var row = await db.Coaches.AsNoTracking()
                                .FirstOrDefaultAsync(c => c.Id == requestedId);
                            if (row is { Role: Role.Coach })
                            {
                                var effectiveTenant = row.ClubTenantId ?? row.Id;
                                tenant.Set(userId, effectiveTenant, email, isAdmin: true);
                            }
                            else
                                tenant.Set(userId, null, email, isAdmin: true);
                        }
                        else
                            tenant.Set(userId, null, email, isAdmin: true);
                    }
                    else
                    {
                        Guid? tenantId = null;
                        var tidClaim = context.User.FindFirst("tid");
                        if (tidClaim != null && Guid.TryParse(tidClaim.Value, out var tid))
                            tenantId = tid;
                        else
                            tenantId = userId;
                        tenant.Set(userId, tenantId, email, isAdmin: false);
                    }
                }
            }

            await next();
        });
    }
}
