namespace CoachSubscriptionApi.DTOs;

public record SessionBookingDto(Guid Id, Guid StudentId, string StudentName, string? StudentPhoneLast4);
public record SessionListDto(Guid Id, string Date, string StartTime, string Type, string Title, string? Location, DateTime CreatedAt, int BookingCount, int AttendanceCount, int AttendedCount, List<Guid> AssignedCoachIds, List<string> CoachNames);
public record AssignedCoachDto(Guid Id, string Name);
public record SessionDetailDto(Guid Id, string Date, string StartTime, string Type, string Title, string? Location, bool RosterOnly, List<SessionBookingDto> Bookings, List<AttendanceDto> Attendances, List<AssignedCoachDto> AssignedCoaches, DateTime CreatedAt, bool CanMarkAttendance);
public record CreateSessionRequest(string Date, string StartTime, string Type, string Title, string? Location, List<Guid>? CoachIds, Guid? StudentId, List<Guid>? StudentIds);
public record UpdateSessionRequest(string Date, string StartTime, string Type, string Title, string? Location, List<Guid>? CoachIds, Guid? StudentId, List<Guid>? StudentIds);
public record BulkCreateSessionsRequest(List<string> Dates, string StartTime, string Type, string Title, string? Location, List<Guid>? CoachIds, Guid? StudentId, List<Guid>? StudentIds);
public record AddSessionBookingsRequest(List<Guid> StudentIds);
public record BulkCreateSessionsResponse(int CreatedCount);
public record AttendanceDto(Guid Id, Guid StudentId, string StudentName, bool Present, int SessionsConsumed);
public record SetAttendanceRequest(List<AttendanceItemRequest> Items);
public record AttendanceItemRequest(Guid StudentId, bool Present, int SessionsConsumed = 1);
public record SetAttendanceResponse(List<StudentClassUsageDto> StudentUsages);
public record StudentClassUsageDto(Guid StudentId, ClassUsageSummaryDto Summary);
public record ClassUsageSummaryDto(int MonthlyClassesTaken, int? SessionsRemaining, int? PackSessionTotal, bool IsUnlimited, string? PackageName, string? PackageType);
public record BatchClassUsageRequest(List<Guid> StudentIds);
public record BatchClassUsageResponse(List<StudentClassUsageDto> Results);
public record PublicPackageDto(Guid Id, string Name, decimal Price, int? TotalSessions, string Type, int ValidityDays, string? Category);
/// <param name="AcademyName">Business / academy name when set; otherwise coach display name.</param>
/// <param name="AcademyType">Category or custom type label for public branding (optional).</param>
public record PublicScheduleViewDto(string AcademyName, string? AcademyType, string? LogoUrl, string? PrimaryColor, List<SessionListDto> Sessions, List<PublicPackageDto> Packages);
public record TrialRequestDto(string Name, string? ParentName, string? Email, string Phone, string? Notes, Guid? DesiredPackageId);
