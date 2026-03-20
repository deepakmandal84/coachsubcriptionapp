namespace CoachSubscriptionApi.DTOs;

public record ParentPortalViewDto(
    string AcademyName,
    string? LogoUrl,
    string? PrimaryColor,
    string StudentName,
    string? PackageName,
    int? RemainingSessions,
    DateTime? ExpiryDate,
    string PaymentStatus,
    Guid? SubscriptionId,
    ClassUsageSummaryDto? ClassUsage);

public record BookSessionRequest(string? Phone, string? Email);
