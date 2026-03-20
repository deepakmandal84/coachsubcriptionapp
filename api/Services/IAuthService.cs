namespace CoachSubscriptionApi.Services;

public interface IAuthService
{
    Task<AuthResult?> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<CoachDto?> GetCoachByIdAsync(Guid id, CancellationToken ct = default);
}

public record RegisterRequest(string Email, string Password, string Name, string? AcademyName = null);
public record LoginRequest(string Email, string Password);

public record AuthResult(string AccessToken, string Email, string Name, Guid Id, string Role, int ExpiresInSeconds);

public record CoachDto(Guid Id, string Email, string Name, string? AcademyName, string? AcademyType, string? LogoUrl, string? PrimaryColor, string Role, string? ScheduleShareToken);
