namespace CoachSubscriptionApi.Helpers;

/// <summary>Calendar dates for sessions (no timezone shift on day boundaries).</summary>
public static class SessionDateHelper
{
    public static DateTime ToUtcDateOnly(DateTime value) =>
        DateTime.SpecifyKind(new DateTime(value.Year, value.Month, value.Day), DateTimeKind.Utc);

    public static string FormatDateOnly(DateTime value) =>
        ToUtcDateOnly(value).ToString("yyyy-MM-dd");

    public static DateTime ParseDateOnly(string? isoDate)
    {
        if (string.IsNullOrWhiteSpace(isoDate))
            throw new ArgumentException("Date is required.");
        var part = isoDate.Trim().Length >= 10 ? isoDate.Trim()[..10] : isoDate.Trim();
        if (!DateTime.TryParse(part, out var parsed))
            throw new ArgumentException("Invalid date.");
        return ToUtcDateOnly(parsed);
    }

    /// <summary>Parse JSON date (DateTime or date string) without shifting the calendar day.</summary>
    public static DateTime ParseRequestDate(DateTime value) => ToUtcDateOnly(value);
}
