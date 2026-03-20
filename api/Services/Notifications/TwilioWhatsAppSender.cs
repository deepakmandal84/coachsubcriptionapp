namespace CoachSubscriptionApi.Services.Notifications;

public class TwilioWhatsAppSender : IWhatsAppSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<TwilioWhatsAppSender> _log;

    public TwilioWhatsAppSender(IConfiguration config, ILogger<TwilioWhatsAppSender> log)
    {
        _config = config;
        _log = log;
    }

    public async Task<SendResult> SendAsync(string toPhone, string body, CancellationToken ct = default)
    {
        var sid = _config["Twilio:AccountSid"];
        var token = _config["Twilio:AuthToken"];
        var from = _config["Twilio:WhatsAppFrom"]; // e.g. whatsapp:+14155238886

        if (string.IsNullOrEmpty(sid) || string.IsNullOrEmpty(token) || string.IsNullOrEmpty(from))
        {
            _log.LogWarning("Twilio not configured; skipping WhatsApp to {To}", toPhone);
            return new SendResult(true, null, "Twilio not configured (skipped)");
        }

        try
        {
            var to = toPhone.StartsWith("whatsapp:") ? toPhone : $"whatsapp:{toPhone}";
            Twilio.TwilioClient.Init(sid, token);
            var message = await Twilio.Rest.Api.V2010.Account.MessageResource.CreateAsync(
                to: to,
                from: from,
                body: body);
            _log.LogInformation("WhatsApp sent to {To}, Sid {Sid}", toPhone, message.Sid);
            return new SendResult(true, message.Sid, null);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Failed to send WhatsApp to {To}", toPhone);
            return new SendResult(false, null, ex.Message);
        }
    }
}
