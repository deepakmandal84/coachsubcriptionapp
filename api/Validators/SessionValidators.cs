using CoachSubscriptionApi.DTOs;
using FluentValidation;

namespace CoachSubscriptionApi.Validators;

public class CreateSessionValidator : AbstractValidator<CreateSessionRequest>
{
    public CreateSessionValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Type).Must(t => t == "Group" || t == "Private");
    }
}

public class UpdateSessionValidator : AbstractValidator<UpdateSessionRequest>
{
    public UpdateSessionValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(300);
        RuleFor(x => x.Type).Must(t => t == "Group" || t == "Private");
    }
}
