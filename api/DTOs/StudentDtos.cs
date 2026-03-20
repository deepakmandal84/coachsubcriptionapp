namespace CoachSubscriptionApi.DTOs;

public record StudentListDto(Guid Id, string Name, string? ParentName, string? Email, string? Phone, string Status, string? Tags, DateTime CreatedAt);
public record StudentDetailDto(Guid Id, string Name, string? ParentName, string? Email, string? Phone, string? Notes, string? Tags, string Status, DateTime CreatedAt);
public record CreateStudentRequest(string Name, string? ParentName, string? Email, string? Phone, string? Notes, string? Tags, string Status = "Active");
public record UpdateStudentRequest(string Name, string? ParentName, string? Email, string? Phone, string? Notes, string? Tags, string Status);
