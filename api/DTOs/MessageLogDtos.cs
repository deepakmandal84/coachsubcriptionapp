namespace CoachSubscriptionApi.DTOs;

public record MessageLogDto(Guid Id, string Recipient, string Channel, string TemplateId, string Status, string? ProviderMessageId, DateTime SentAt, string? ErrorMessage);
