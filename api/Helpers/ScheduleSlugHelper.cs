using System.Text;
using System.Text.RegularExpressions;

namespace CoachSubscriptionApi.Helpers;

public static class ScheduleSlugHelper
{
    public const int MaxLength = 64;
    public const int MinLength = 2;

    private static readonly HashSet<string> Reserved = new(StringComparer.OrdinalIgnoreCase)
    {
        "info", "login", "register", "admin", "api", "p", "s", "static", "assets",
        "sessions", "settings", "students", "packages", "subscriptions", "dashboard"
    };

    /// <summary>Build a URL slug from academy or coach name (lowercase, hyphens).</summary>
    public static string SlugifyFromDisplayName(string? academyOrName)
    {
        var raw = string.IsNullOrWhiteSpace(academyOrName) ? "classes" : academyOrName.Trim().ToLowerInvariant();
        var sb = new StringBuilder();
        var prevHyphen = false;
        foreach (var ch in raw)
        {
            if (ch is >= 'a' and <= 'z' or >= '0' and <= '9')
            {
                sb.Append(ch);
                prevHyphen = false;
            }
            else if (ch is ' ' or '-' or '_' or '.' or '/')
            {
                if (sb.Length > 0 && !prevHyphen)
                {
                    sb.Append('-');
                    prevHyphen = true;
                }
            }
        }
        while (sb.Length > 0 && sb[^1] == '-') sb.Length--;
        while (sb.Length > 0 && sb[0] == '-') sb.Remove(0, 1);
        var s = sb.ToString();
        if (s.Length < MinLength) s = "classes";
        if (s.Length > MaxLength) s = s[..MaxLength].TrimEnd('-');
        if (s.Length < MinLength) s = "classes";
        return s;
    }

    /// <summary>Validate coach-chosen slug; normalized form is lowercase [a-z0-9-].</summary>
    public static bool TryValidateManualSlug(string input, out string normalized, out string? error)
    {
        normalized = string.Empty;
        error = null;
        if (string.IsNullOrWhiteSpace(input))
        {
            error = "Link path cannot be empty.";
            return false;
        }
        normalized = input.Trim().ToLowerInvariant();
        if (normalized.Length < MinLength)
        {
            error = $"Link path must be at least {MinLength} characters.";
            return false;
        }
        if (normalized.Length > MaxLength)
        {
            error = $"Link path must be at most {MaxLength} characters.";
            return false;
        }
        if (!Regex.IsMatch(normalized, @"^[a-z0-9]+(-[a-z0-9]+)*$"))
        {
            error = "Use only letters, numbers, and single hyphens (e.g. dance-studio or dancestudio).";
            return false;
        }
        if (Reserved.Contains(normalized))
        {
            error = "That path is reserved. Choose another.";
            return false;
        }
        return true;
    }
}
