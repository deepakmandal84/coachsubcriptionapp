namespace CoachSubscriptionApi.Services.Notifications;

/// <summary>
/// Sends email instantly via the configured SMTP email client. Logging is done by the caller (e.g. ReminderService).
/// </summary>
public class SmtpEmailSender : IEmailSender
{
    private readonly IEmailClient _client;

    public SmtpEmailSender(IEmailClient client)
    {
        _client = client;
    }

    public Task<SendResult> SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
        => _client.SendAsync(toEmail, subject, body, ct);
}
