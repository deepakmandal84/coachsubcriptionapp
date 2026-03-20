namespace CoachSubscriptionApi.Data;

public interface ICurrentTenantService
{
    Guid? TenantId { get; }
    Guid? UserId { get; }
    string? Email { get; }
    bool IsAdmin { get; }
    void Set(Guid userId, Guid? tenantId, string email, bool isAdmin);
}

public class CurrentTenantService : ICurrentTenantService
{
    public Guid? TenantId { get; private set; }
    public Guid? UserId { get; private set; }
    public string? Email { get; private set; }
    public bool IsAdmin { get; private set; }

    public void Set(Guid userId, Guid? tenantId, string email, bool isAdmin)
    {
        UserId = userId;
        TenantId = tenantId;
        Email = email;
        IsAdmin = isAdmin;
    }
}
