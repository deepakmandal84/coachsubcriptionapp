namespace CoachSubscriptionApi.Services.Notifications;

/// <summary>
/// Sends email via .NET SmtpClient using Gmail account and password from config.
/// Configure Smtp:Host, User, Password, From in appsettings.
/// </summary>
public class SmtpEmailClient : IEmailClient
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailClient> _log;

    public SmtpEmailClient(IConfiguration config, ILogger<SmtpEmailClient> log)
    {
        _config = config;
        _log = log;
    }

    public async Task<SendResult> SendAsync1(
    string toEmail,
    string subject,
    string body,
    CancellationToken ct = default)
   {
        var host = _config["Smtp:Host"]?.Trim();
        var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
        var user = _config["Smtp:User"]?.Trim();
        var pass = (_config["Smtp:Password"] ?? "").Replace(" ", "", StringComparison.Ordinal).Trim();
        var from = (_config["Smtp:From"] ?? user ?? "noreply@coachapp.local").Trim();
        var useSsl = bool.TryParse(_config["Smtp:UseSsl"], out var ssl) ? ssl : true;

        if (string.IsNullOrWhiteSpace(host))
        {
            _log.LogWarning("SMTP not configured (Smtp:Host empty); skipping email to {To}", toEmail);
            return new SendResult(false, null, "SMTP not configured.");
        }

        var isLocalServer =
            host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase);

        if (!isLocalServer && (string.IsNullOrWhiteSpace(user) || string.IsNullOrWhiteSpace(pass)))
        {
            _log.LogWarning("Smtp:User or Smtp:Password is empty.");
            return new SendResult(false, null, "Smtp:User and Smtp:Password are required.");
        }

        try
        {
            using var client = new System.Net.Mail.SmtpClient(host, port)
            {
                EnableSsl = useSsl,
                UseDefaultCredentials = false,
                //DeliveryMethod = System.Net.Mail.SmtpDeliveryMethod.Network
            };

            if (!string.IsNullOrWhiteSpace(user))
            {
                client.Credentials = new System.Net.NetworkCredential("mechintosoftware84@gmail.com", "yztrpsdacziwllnm");
            }

            using var msg = new System.Net.Mail.MailMessage(from, toEmail, subject, body)
            {
                IsBodyHtml = true
            };

            await client.SendMailAsync(msg, ct);

            _log.LogInformation("Email sent to {To}", toEmail);
            return new SendResult(true, null, null);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to send email to {To}", toEmail);
            return new SendResult(false, null, ex.Message);
        }
    }

    public async Task<SendResult> SendAsync(string toEmail, string subject, string body, CancellationToken ct = default)
    {
        var host = _config["Smtp:Host"]?.Trim();
        var port = int.TryParse(_config["Smtp:Port"], out var p) ? p : 587;
        var user = _config["Smtp:User"]?.Trim();
        var pass = (_config["Smtp:Password"] ?? "").Replace(" ", "", StringComparison.Ordinal).Trim();
        var from = (_config["Smtp:From"] ?? user ?? "noreply@coachapp.local").Trim();
        var useSsl = _config["Smtp:UseSsl"] != "false";

        if (string.IsNullOrEmpty(host))
        {
            _log.LogWarning("SMTP not configured (Smtp:Host empty); skipping email to {To}", toEmail);
            return new SendResult(false, null, "SMTP not configured (set Smtp:Host, Smtp:User, Smtp:Password, Smtp:From)");
        }

        var isLocalServer = host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || host == "127.0.0.1";
        if (!isLocalServer && (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass)))
        {
            _log.LogWarning("Smtp:User or Smtp:Password is empty.");
            return new SendResult(false, null, "Smtp:User and Smtp:Password are required.");
        }

        try
        {
            using var client = new System.Net.Mail.SmtpClient(host, port);
            client.EnableSsl = useSsl && port != 25;
            client.UseDefaultCredentials = false;
            if (!string.IsNullOrEmpty(user))
                client.Credentials = new System.Net.NetworkCredential(user, pass);

            var msg = new System.Net.Mail.MailMessage(from, toEmail, subject, body);
            msg.IsBodyHtml = true;
            await client.SendMailAsync(msg, ct);

            _log.LogInformation("Email sent to {To}", toEmail);
            return new SendResult(true, null, null);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to send email to {To}", toEmail);
            return new SendResult(false, null, ex.Message);
        }
    }
}
