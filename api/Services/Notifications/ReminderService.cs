using Microsoft.EntityFrameworkCore;
using CoachSubscriptionApi.Data;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services.Notifications;

public class ReminderService : IReminderService
{
    private readonly AppDbContext _db;
    private readonly IEmailSender _email;
    private readonly IWhatsAppSender _whatsApp;
    private readonly ILogger<ReminderService> _log;

    public ReminderService(AppDbContext db, IEmailSender email, IWhatsAppSender whatsApp, ILogger<ReminderService> log)
    {
        _db = db;
        _email = email;
        _whatsApp = whatsApp;
        _log = log;
    }

    public async Task SendReminderNowAsync(Guid subscriptionId, string? channel, CancellationToken ct = default)
    {
        var sub = await _db.Subscriptions
            .Include(s => s.Student)
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId, ct);
        if (sub == null) return;

        var sendEmail = channel == null || channel.Equals("email", StringComparison.OrdinalIgnoreCase);
        var sendWhatsApp = channel == null || channel.Equals("whatsapp", StringComparison.OrdinalIgnoreCase);
        var student = sub.Student;
        var package = sub.Package.Name;
        var expiring = sub.ExpiryDate.ToString("d");
        var remaining = sub.RemainingSessions?.ToString() ?? "unlimited";

        if (sub.PaymentStatus == PaymentStatus.Due)
        {
            var subject = "Payment due for your subscription";
            var body = $"Hi {student.Name},\n\nYour subscription for {package} has a payment due. Please contact your coach to complete payment.";
            if (sendEmail && !string.IsNullOrEmpty(student.Email))
                await SendAndLogAsync(sub.TenantId, student.Email, MessageChannel.Email, ReminderTemplates.PaymentDue, subject, body, null, ct);
            if (sendWhatsApp && !string.IsNullOrEmpty(student.Phone))
                await SendWhatsAppAndLogAsync(sub.TenantId, student.Phone, ReminderTemplates.PaymentDue, body, ct);
        }
        else
        {
            var subject = "Your package is expiring soon";
            var body = $"Hi {student.Name},\n\nYour package {package} expires on {expiring}. Remaining sessions: {remaining}. Please renew to continue.";
            if (sendEmail && !string.IsNullOrEmpty(student.Email))
                await SendAndLogAsync(sub.TenantId, student.Email, MessageChannel.Email, ReminderTemplates.PackageExpiring, subject, body, null, ct);
            if (sendWhatsApp && !string.IsNullOrEmpty(student.Phone))
                await SendWhatsAppAndLogAsync(sub.TenantId, student.Phone, ReminderTemplates.PackageExpiring, body, ct);
        }
    }

    public async Task SendExpiringRemindersAsync(CancellationToken ct = default)
    {
        var inThreeDays = DateTime.UtcNow.Date.AddDays(3);
        var subs = await _db.Subscriptions
            .Include(s => s.Student)
            .Include(s => s.Package)
            .Where(s => s.Status == SubscriptionStatus.Active && s.ExpiryDate.Date <= inThreeDays && s.ExpiryDate.Date >= DateTime.UtcNow.Date)
            .ToListAsync(ct);
        foreach (var sub in subs)
        {
            await SendReminderNowAsync(sub.Id, null, ct);
        }
    }

    public async Task SendPaymentDueRemindersAsync(CancellationToken ct = default)
    {
        var subs = await _db.Subscriptions
            .Include(s => s.Student)
            .Include(s => s.Package)
            .Where(s => s.Status == SubscriptionStatus.Active && s.PaymentStatus == PaymentStatus.Due)
            .ToListAsync(ct);
        foreach (var sub in subs)
        {
            await SendReminderNowAsync(sub.Id, null, ct);
        }
    }

    public async Task NotifyCoachRequestRenewalAsync(Guid tenantId, string studentName, string? parentEmail, string? parentPhone, string packageName, CancellationToken ct = default)
    {
        var coach = await _db.Coaches.AsNoTracking().FirstOrDefaultAsync(c => c.Id == tenantId, ct);
        if (coach == null) return;
        var subject = "Parent requested renewal";
        var body = $"Parent/guardian for {studentName} has requested renewal for package: {packageName}. Contact them to complete.";
        if (!string.IsNullOrEmpty(coach.Email))
            await SendAndLogAsync(tenantId, coach.Email, MessageChannel.Email, ReminderTemplates.RequestRenewal, subject, body, null, ct);
    }

    private async Task SendAndLogAsync(Guid tenantId, string to, MessageChannel ch, string templateId, string subject, string body, string? providerId, CancellationToken ct)
    {
        var result = await _email.SendAsync(to, subject, body, ct);
        _db.MessageLogs.Add(new MessageLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Recipient = to,
            Channel = ch,
            TemplateId = templateId,
            Status = result.Success ? MessageLogStatus.Sent : MessageLogStatus.Failed,
            ProviderMessageId = result.ProviderMessageId ?? providerId,
            SentAt = DateTime.UtcNow,
            ErrorMessage = result.ErrorMessage
        });
        await _db.SaveChangesAsync(ct);
    }

    private async Task SendWhatsAppAndLogAsync(Guid tenantId, string to, string templateId, string body, CancellationToken ct)
    {
        var result = await _whatsApp.SendAsync(to, body, ct);
        _db.MessageLogs.Add(new MessageLog
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Recipient = to,
            Channel = MessageChannel.WhatsApp,
            TemplateId = templateId,
            Status = result.Success ? MessageLogStatus.Sent : MessageLogStatus.Failed,
            ProviderMessageId = result.ProviderMessageId,
            SentAt = DateTime.UtcNow,
            ErrorMessage = result.ErrorMessage
        });
        await _db.SaveChangesAsync(ct);
    }
}
