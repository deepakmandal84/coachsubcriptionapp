namespace CoachSubscriptionApi.DTOs;

public record DashboardDto(
    int StudentCount,
    int ActiveSubscriptionCount,
    int PaymentsDueCount,
    decimal MonthRevenue,
    List<ExpiringSoonItem> ExpiringSoon);

public record ExpiringSoonItem(Guid SubscriptionId, string StudentName, string PackageName, DateTime ExpiryDate, int? RemainingSessions);
