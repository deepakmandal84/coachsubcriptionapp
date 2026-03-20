using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace CoachSubscriptionApi;

public static class TenantMiddleware
{
    public static void UseTenantFromJwt(this IApplicationBuilder app)
    {
        app.Use(async (context, next) =>
        {
            var tenant = context.RequestServices.GetRequiredService<Data.ICurrentTenantService>();
            if (context.User.Identity?.IsAuthenticated == true)
            {
                var idClaim = context.User.FindFirst(ClaimTypes.NameIdentifier) ?? context.User.FindFirst("sub");
                var emailClaim = context.User.FindFirst(ClaimTypes.Email) ?? context.User.FindFirst("email");
                var roleClaim = context.User.FindFirst(ClaimTypes.Role) ?? context.User.FindFirst("role");
                if (idClaim != null && Guid.TryParse(idClaim.Value, out var userId))
                {
                    var isAdmin = string.Equals(roleClaim?.Value, "Admin", StringComparison.OrdinalIgnoreCase);
                    // For Coach, tenant = userId. For Admin, no tenant when managing platform.
                    var tenantId = isAdmin ? (Guid?)null : userId;
                    tenant.Set(userId, tenantId, emailClaim?.Value ?? "", isAdmin);
                }
            }
            await next();
        });
    }
}
