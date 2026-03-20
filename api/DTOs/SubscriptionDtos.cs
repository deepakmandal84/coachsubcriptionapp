namespace CoachSubscriptionApi.DTOs;

public record SubscriptionListDto(Guid Id, Guid StudentId, string StudentName, Guid PackageId, string PackageName,
    DateTime StartDate, DateTime ExpiryDate, int? RemainingSessions, string Status, string PaymentStatus, string PaymentMethod, DateTime CreatedAt, bool HasPendingRenewal);
public record SubscriptionDetailDto(Guid Id, Guid StudentId, string StudentName, Guid PackageId, string PackageName,
    DateTime StartDate, DateTime ExpiryDate, int? RemainingSessions, string Status, string PaymentStatus, string PaymentMethod,
    List<PaymentDto> Payments, DateTime CreatedAt);
public record PaymentDto(Guid Id, decimal Amount, DateTime PaidAt, string Method, string? Notes);
public record CreateSubscriptionRequest(Guid StudentId, Guid PackageId, DateTime StartDate, string PaymentStatus = "Due", string PaymentMethod = "Cash");
public record UpdateSubscriptionRequest(DateTime? ExpiryDate, int? RemainingSessions, string? Status, string? PaymentStatus);
public record RecordPaymentRequest(decimal Amount, string Method, string? Notes);
public record CreateParentLinkRequest(Guid StudentId, Guid? SubscriptionId, int ExpiryDays = 30);
public record RenewalTransactionDto(Guid Id, Guid StudentId, string StudentName, Guid? SubscriptionId, string? PackageName, DateTime RequestedAt, DateTime ConfirmedAt);
