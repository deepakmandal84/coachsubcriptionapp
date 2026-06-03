namespace CoachSubscriptionApi.DTOs;

public record DailyCountDto(string Date, int Count);

public record DashboardDto(
    int StudentCount,
    int ActiveSubscriptionCount,
    int PaymentsDueCount,
    decimal MonthRevenue,
    List<ExpiringSoonItem> ExpiringSoon,
    List<DailyCountDto> SessionsPerDay,
    List<DailyCountDto> CheckInsPerDay,
    List<DailyCountDto> CheckInsCurrentMonth);

public record ExpiringSoonItem(Guid SubscriptionId, string StudentName, string PackageName, DateTime ExpiryDate, int? RemainingSessions);

public record MonthlyReportDto(List<MonthlyReportRowDto> Months);

public record MonthlyReportRowDto(
    int Year,
    int Month,
    string Label,
    int ActiveStudentCount,
    int ActiveSubscriptionCount,
    decimal Revenue);
