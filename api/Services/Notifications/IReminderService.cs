using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services.Notifications;

public interface IReminderService
{
    Task SendReminderNowAsync(Guid subscriptionId, string? channel, CancellationToken ct = default);
    Task SendExpiringRemindersAsync(CancellationToken ct = default);
    Task SendPaymentDueRemindersAsync(CancellationToken ct = default);
    Task NotifyCoachRequestRenewalAsync(Guid tenantId, string studentName, string? parentEmail, string? parentPhone, string packageName, CancellationToken ct = default);
}

public static class ReminderTemplates
{
    public const string PackageExpiring = "PackageExpiring";
    public const string PaymentDue = "PaymentDue";
    public const string RequestRenewal = "RequestRenewal";
}
