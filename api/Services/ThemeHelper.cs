namespace CoachSubscriptionApi.Services;

public static class ThemeHelper
{
    public const string Cricket = "Cricket";
    public const string Bollyx = "Bollyx";
    public const string PersonalTraining = "Personal Training";
    public const string Dance = "Dance";

    private static readonly Dictionary<string, string> ThemeColors = new(StringComparer.OrdinalIgnoreCase)
    {
        [Cricket] = "#16a34a",
        [Bollyx] = "#c026d3",
        [PersonalTraining] = "#ea580c",
        [Dance] = "#7c3aed",
    };

    public static readonly IReadOnlyList<string> PredefinedCategories = new[] { Cricket, Bollyx, PersonalTraining, Dance };

    public static string GetThemeColorForCategory(string? category)
    {
        if (string.IsNullOrWhiteSpace(category)) return "#2563eb";
        return ThemeColors.TryGetValue(category.Trim(), out var color) ? color : "#2563eb";
    }
}
