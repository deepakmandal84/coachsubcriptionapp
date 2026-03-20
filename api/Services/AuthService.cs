using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<AuthResult?> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        if (await _db.Coaches.AnyAsync(c => c.Email == request.Email, ct))
            return null;
        var coach = new Coach
        {
            Id = Guid.NewGuid(),
            Email = request.Email.Trim().ToLowerInvariant(),
            PasswordHash = HashPassword(request.Password),
            Name = request.Name.Trim(),
            AcademyName = request.AcademyName?.Trim(),
            Role = Role.Coach,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        _db.Coaches.Add(coach);
        await _db.SaveChangesAsync(ct);
        return BuildResult(coach);
    }

    public async Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var coach = await _db.Coaches
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == request.Email.Trim().ToLowerInvariant(), ct);
        if (coach == null || !VerifyPassword(request.Password, coach.PasswordHash) || !coach.IsActive)
            return null;
        return BuildResult(coach);
    }

    public async Task<CoachDto?> GetCoachByIdAsync(Guid id, CancellationToken ct = default)
    {
        var c = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        return c == null ? null : new CoachDto(c.Id, c.Email, c.Name, c.AcademyName, c.AcademyType, c.LogoUrl, c.PrimaryColor, c.Role.ToString(), c.ScheduleShareToken);
    }

    private static string HashPassword(string password)
    {
        using var sha = SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(password);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    private static bool VerifyPassword(string password, string hash)
    {
        var computed = HashPassword(password);
        return string.Equals(computed, hash, StringComparison.Ordinal);
    }

    private AuthResult BuildResult(Coach coach)
    {
        var key = _config["Jwt:Key"] ?? "dev-key-min-32-chars-long-secret!!";
        var issuer = _config["Jwt:Issuer"] ?? "CoachSubscription";
        var audience = _config["Jwt:Audience"] ?? "CoachSubscription";
        var expiresMinutes = int.TryParse(_config["Jwt:ExpiresMinutes"], out var m) ? m : 60;
        var credentials = new SigningCredentials(
            new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, coach.Id.ToString()),
            new Claim(ClaimTypes.Email, coach.Email),
            new Claim(ClaimTypes.Role, coach.Role.ToString()),
            new Claim("sub", coach.Id.ToString())
        };
        var token = new JwtSecurityToken(issuer, audience, claims, DateTime.UtcNow, DateTime.UtcNow.AddMinutes(expiresMinutes), credentials);
        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        return new AuthResult(accessToken, coach.Email, coach.Name, coach.Id, coach.Role.ToString(), expiresMinutes * 60);
    }
}
