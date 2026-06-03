namespace CoachSubscriptionApi.DTOs;

public record StudentListDto(Guid Id, string Name, string? ParentName, string? Email, string? Phone, string Status, string? Tags, string MeasurementUnit, string Gender, DateTime CreatedAt);
public record StudentDetailDto(
    Guid Id, string Name, string? ParentName, string? Email, string? Phone, string? Notes, string? Tags,
    string Status, string MeasurementUnit, string Gender, decimal? Height, DateTime? DateOfBirth, int? AgeYears,
    DateTime CreatedAt);
public record CreateStudentRequest(
    string Name, string? ParentName, string? Email, string? Phone, string? Notes, string? Tags,
    string Status = "Active", string? MeasurementUnit = null, string? Gender = null, decimal? Height = null,
    DateTime? DateOfBirth = null);
public record UpdateStudentRequest(
    string Name, string? ParentName, string? Email, string? Phone, string? Notes, string? Tags, string Status,
    string? MeasurementUnit = null, string? Gender = null, decimal? Height = null, DateTime? DateOfBirth = null);

public record SessionMatrixMonthDto(int Year, int Month, string Label);

public record StudentSessionMatrixRowDto(Guid StudentId, string StudentName, List<int> SessionCounts);

public record StudentSessionMatrixDto(
    List<SessionMatrixMonthDto> Months,
    List<StudentSessionMatrixRowDto> Rows);
