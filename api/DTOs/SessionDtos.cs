namespace CoachSubscriptionApi.DTOs;

public record SessionBookingDto(Guid Id, Guid StudentId, string StudentName, string? StudentPhoneLast4);
public record SessionListDto(Guid Id, DateTime Date, TimeSpan StartTime, string Type, string Title, string? Location, DateTime CreatedAt, int BookingCount, int AttendanceCount);
public record SessionDetailDto(Guid Id, DateTime Date, TimeSpan StartTime, string Type, string Title, string? Location, List<SessionBookingDto> Bookings, List<AttendanceDto> Attendances, DateTime CreatedAt);
public record CreateSessionRequest(DateTime Date, string StartTime, string Type, string Title, string? Location);
public record UpdateSessionRequest(DateTime Date, string StartTime, string Type, string Title, string? Location);
public record AttendanceDto(Guid Id, Guid StudentId, string StudentName, bool Present, int SessionsConsumed);
public record SetAttendanceRequest(List<AttendanceItemRequest> Items);
public record AttendanceItemRequest(Guid StudentId, bool Present, int SessionsConsumed = 1);
public record SetAttendanceResponse(List<StudentClassUsageDto> StudentUsages);
public record StudentClassUsageDto(Guid StudentId, ClassUsageSummaryDto Summary);
public record ClassUsageSummaryDto(int MonthlyClassesTaken, int? SessionsRemaining, int? PackSessionTotal, bool IsUnlimited, string? PackageName, string? PackageType);
public record BatchClassUsageRequest(List<Guid> StudentIds);
public record BatchClassUsageResponse(List<StudentClassUsageDto> Results);
public record PublicPackageDto(Guid Id, string Name, decimal Price, int? TotalSessions, string Type, int ValidityDays, string? Category);
public record PublicScheduleViewDto(string AcademyName, string? LogoUrl, string? PrimaryColor, List<SessionListDto> Sessions, List<PublicPackageDto> Packages);
public record TrialRequestDto(string Name, string? ParentName, string? Email, string Phone, string? Notes, Guid? DesiredPackageId);
