using CoachSubscriptionApi.DTOs;
using FluentValidation;

namespace CoachSubscriptionApi.Validators;

public class CreateSessionValidator : AbstractValidator<CreateSessionRequest>
{
    public CreateSessionValidator()
    {
        RuleFor(x => x.Title).MaximumLength(300);
        RuleFor(x => x.Type).Must(t => t == "Group" || t == "Private");
        RuleFor(x => x.Title).NotEmpty().When(x => x.Type == "Group");
        RuleFor(x => x.StudentId).NotEmpty().When(x => x.Type == "Private")
            .WithMessage("Select a client for personal training sessions.");
    }
}

public class UpdateSessionValidator : AbstractValidator<UpdateSessionRequest>
{
    public UpdateSessionValidator()
    {
        RuleFor(x => x.Title).MaximumLength(300);
        RuleFor(x => x.Type).Must(t => t == "Group" || t == "Private");
        RuleFor(x => x.Title).NotEmpty().When(x => x.Type == "Group");
        RuleFor(x => x.StudentId).NotEmpty().When(x => x.Type == "Private")
            .WithMessage("Select a client for personal training sessions.");
    }
}
