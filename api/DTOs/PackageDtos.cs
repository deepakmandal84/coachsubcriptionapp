namespace CoachSubscriptionApi.DTOs;

public record PackageListDto(Guid Id, string Name, decimal Price, int ValidityDays, int? TotalSessions, string Type, string? Category, DateTime CreatedAt);
public record PackageDetailDto(Guid Id, string Name, decimal Price, int ValidityDays, int? TotalSessions, string Type, string? Category, DateTime CreatedAt);
public record CreatePackageRequest(string Name, decimal Price, int ValidityDays, int? TotalSessions, string Type, string? Category);
public record UpdatePackageRequest(string Name, decimal Price, int ValidityDays, int? TotalSessions, string Type, string? Category);
