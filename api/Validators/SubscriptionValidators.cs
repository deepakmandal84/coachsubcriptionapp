using CoachSubscriptionApi.DTOs;
using FluentValidation;

namespace CoachSubscriptionApi.Validators;

public class CreateSubscriptionValidator : AbstractValidator<CreateSubscriptionRequest>
{
    public CreateSubscriptionValidator()
    {
        RuleFor(x => x.StudentId).NotEmpty();
        RuleFor(x => x.PackageId).NotEmpty();
        RuleFor(x => x.PaymentStatus).Must(s => s == "Paid" || s == "Due");
        RuleFor(x => x.PaymentMethod).Must(m => m is "Cash" or "Zelle" or "Venmo" or "Card");
    }
}

public class RecordPaymentValidator : AbstractValidator<RecordPaymentRequest>
{
    public RecordPaymentValidator()
    {
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.Method).Must(m => m is "Cash" or "Zelle" or "Venmo" or "Card");
    }
}
