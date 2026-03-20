namespace CoachSubscriptionApi.Helpers;

public static class PhoneNormalizer
{
    /// <summary>Returns digits-only form for comparison, or null if empty after normalization.</summary>
    public static string? Normalize(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        return digits.Length == 0 ? null : digits;
    }
}
