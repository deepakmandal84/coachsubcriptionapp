namespace CoachSubscriptionApi.Services.Notifications;

/// <summary>
/// Sends email immediately via Smtp (User/Password) from config.
/// </summary>
public interface IEmailClient
{
    Task<SendResult> SendAsync(string toEmail, string subject, string body, CancellationToken ct = default);
}
