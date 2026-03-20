namespace CoachSubscriptionApi.Services.Notifications;

public interface IEmailSender
{
    Task<SendResult> SendAsync(string toEmail, string subject, string body, CancellationToken ct = default);
}

public interface IWhatsAppSender
{
    Task<SendResult> SendAsync(string toPhone, string body, CancellationToken ct = default);
}

public record SendResult(bool Success, string? ProviderMessageId, string? ErrorMessage);
