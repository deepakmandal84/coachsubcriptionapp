using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;

namespace CoachSubscriptionApi.Jobs;

public class ReminderJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReminderJob> _log;

    public ReminderJob(IServiceScopeFactory scopeFactory, ILogger<ReminderJob> log)
    {
        _scopeFactory = scopeFactory;
        _log = log;
    }

    public async Task RunAsync(CancellationToken ct = default)
    {
        List<Guid> coachIds;
        using (var scope = _scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            coachIds = await db.Coaches.IgnoreQueryFilters().Select(c => c.Id).ToListAsync(ct);
        }
        foreach (var coachId in coachIds)
        {
            try
            {
                using var inner = _scopeFactory.CreateScope();
                var tenant = inner.ServiceProvider.GetRequiredService<ICurrentTenantService>();
                tenant.Set(coachId, coachId, "", false);
                var reminder = inner.ServiceProvider.GetRequiredService<Services.Notifications.IReminderService>();
                await reminder.SendExpiringRemindersAsync(ct);
                await reminder.SendPaymentDueRemindersAsync(ct);
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Reminder job failed for coach {CoachId}", coachId);
            }
        }
    }
}
