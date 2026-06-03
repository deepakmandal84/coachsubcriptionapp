using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

/// <summary>Derived body composition metrics (calculator.net parity).</summary>
public static class BodyCompositionHelper
{
    static readonly (int Age, decimal Female, decimal Male)[] JpIdeal =
    [
        (20, 17.7m, 8.5m), (25, 18.4m, 10.5m), (30, 19.3m, 12.7m), (35, 21.5m, 13.7m),
        (40, 22.2m, 15.3m), (45, 22.9m, 16.4m), (50, 25.2m, 18.9m), (55, 26.3m, 20.9m),
    ];

    public static decimal? IdealJacksonPollock(StudentGender gender, int? ageYears)
    {
        if (gender is not (StudentGender.Male or StudentGender.Female) || ageYears == null) return null;
        var female = gender == StudentGender.Female;
        if (ageYears <= JpIdeal[0].Age) return female ? JpIdeal[0].Female : JpIdeal[0].Male;
        var last = JpIdeal[^1];
        if (ageYears >= last.Age) return female ? last.Female : last.Male;
        for (var i = 0; i < JpIdeal.Length - 1; i++)
        {
            var (a0, f0, m0) = JpIdeal[i];
            var (a1, f1, m1) = JpIdeal[i + 1];
            if (ageYears >= a0 && ageYears <= a1)
            {
                var t = (decimal)(ageYears.Value - a0) / (a1 - a0);
                var v0 = female ? f0 : m0;
                var v1 = female ? f1 : m1;
                return Math.Round(v0 + t * (v1 - v0), 1);
            }
        }
        return null;
    }

    public static string? Category(StudentGender gender, decimal percent)
    {
        if (gender == StudentGender.Female)
        {
            if (percent < 14) return "Essential fat";
            if (percent <= 20) return "Athletes";
            if (percent <= 24) return "Fitness";
            if (percent <= 31) return "Average";
            return "Obese";
        }
        if (gender == StudentGender.Male)
        {
            if (percent < 6) return "Essential fat";
            if (percent <= 13) return "Athletes";
            if (percent <= 17) return "Fitness";
            if (percent <= 24) return "Average";
            return "Obese";
        }
        return null;
    }

    public static (decimal? FatMass, decimal? LeanMass, decimal? FatToLose) Masses(
        decimal? weightUser, MeasurementUnit unit, decimal bodyFatPercent, decimal? idealPercent)
    {
        if (weightUser is null or <= 0) return (null, null, null);
        var fat = Math.Round(weightUser.Value * bodyFatPercent / 100m, 1);
        var lean = Math.Round(weightUser.Value - fat, 1);
        decimal? toLose = null;
        if (idealPercent.HasValue && bodyFatPercent > idealPercent.Value)
            toLose = Math.Round((bodyFatPercent - idealPercent.Value) * weightUser.Value / 100m, 1);
        else if (idealPercent.HasValue)
            toLose = 0;
        return (fat, lean, toLose);
    }

    public static BodyFatPreviewDto BuildPreview(Student student, BodyFatPreviewRequest request)
    {
        var measurementsCm = ProgressMeasurementHelper.FromUserMeasurements(request.Measurements, student.MeasurementUnit);
        var weightKg = ProgressMeasurementHelper.KgFromUserWeight(request.Weight, student.MeasurementUnit);
        var calc = BodyFatCalculator.Preview(student, measurementsCm, weightKg);
        var (_, method) = BodyFatCalculator.Resolve(null, student, measurementsCm, weightKg);

        var missing = new List<string>();
        if (student.Gender is StudentGender.Unspecified) missing.Add("Gender");
        if (student.HeightCm == null) missing.Add("Height (in profile)");
        if (student.DateOfBirth == null && student.Gender != StudentGender.Unspecified) missing.Add("Date of birth (for BMI fallback)");
        if (measurementsCm?.Neck == null) missing.Add("Neck");
        if (measurementsCm?.Waist == null) missing.Add("Waist");
        if (student.Gender == StudentGender.Female && measurementsCm?.Hips == null) missing.Add("Hips");
        if (weightKg == null && calc == null) missing.Add("Weight");

        BodyCompositionBreakdownDto? breakdown = null;
        if (calc.HasValue)
        {
            var age = BodyFatCalculator.AgeYears(student.DateOfBirth);
            var ideal = IdealJacksonPollock(student.Gender, age);
            var (fat, lean, toLose) = Masses(request.Weight, student.MeasurementUnit, calc.Value, ideal);
            breakdown = new BodyCompositionBreakdownDto(
                BodyFatCalculator.PreviewNavy(student, measurementsCm),
                BodyFatCalculator.PreviewBmi(student, weightKg),
                Category(student.Gender, calc.Value),
                ideal,
                fat,
                lean,
                toLose,
                student.MeasurementUnit == MeasurementUnit.Imperial ? "lb" : "kg");
        }

        return new BodyFatPreviewDto(calc, method?.ToString(), missing, breakdown);
    }
}
