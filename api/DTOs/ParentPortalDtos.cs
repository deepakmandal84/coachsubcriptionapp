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
    ClassUsageSummaryDto? ClassUsage,
    DateTime JoinedAt);

public record BookSessionRequest(string? Phone, string? Email);

public record ParentSessionListDto(
    Guid Id,
    DateTime Date,
    TimeSpan StartTime,
    string Type,
    string Title,
    string? Location,
    bool IsBooked);

public record ParentAttendedClassDto(
    Guid SessionId,
    DateTime Date,
    TimeSpan StartTime,
    string Type,
    string Title,
    string? Location,
    int SessionsConsumed);
