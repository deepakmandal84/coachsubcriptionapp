namespace CoachSubscriptionApi.Entities;

public enum MessageChannel { Email, WhatsApp }
public enum MessageLogStatus { Sent, Failed }

public class MessageLog
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public string Recipient { get; set; } = string.Empty;
    public MessageChannel Channel { get; set; }
    public string TemplateId { get; set; } = string.Empty;
    public MessageLogStatus Status { get; set; }
    public string? ProviderMessageId { get; set; }
    public DateTime SentAt { get; set; }
    public string? ErrorMessage { get; set; }
}
