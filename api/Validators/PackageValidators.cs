using CoachSubscriptionApi.DTOs;
using FluentValidation;

namespace CoachSubscriptionApi.Validators;

public class CreatePackageValidator : AbstractValidator<CreatePackageRequest>
{
    public CreatePackageValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ValidityDays).GreaterThan(0);
        RuleFor(x => x.TotalSessions).GreaterThan(0).When(x => x.TotalSessions.HasValue);
        RuleFor(x => x.Type).Must(t => t is "ClassPack" or "MonthlyUnlimited" or "DropIn");
    }
}

public class UpdatePackageValidator : AbstractValidator<UpdatePackageRequest>
{
    public UpdatePackageValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.ValidityDays).GreaterThan(0);
        RuleFor(x => x.TotalSessions).GreaterThan(0).When(x => x.TotalSessions.HasValue);
        RuleFor(x => x.Type).Must(t => t is "ClassPack" or "MonthlyUnlimited" or "DropIn");
    }
}
