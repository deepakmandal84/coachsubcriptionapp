using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

/// <summary>
/// US Navy circumference method (primary) and Deurenberg BMI estimate (fallback).
/// Measurements internally in cm; height in cm.
/// </summary>
public static class BodyFatCalculator
{
    public static (decimal? Percent, BodyFatMethod? Method) Resolve(
        decimal? manualPercent,
        Student student,
        BodyMeasurementsDto? measurementsCm,
        decimal? weightKg)
    {
        if (manualPercent.HasValue)
            return (Math.Round(manualPercent.Value, 1), BodyFatMethod.Manual);

        var calculated = TryNavy(student.Gender, student.HeightCm, measurementsCm);
        if (calculated.HasValue)
            return (calculated, BodyFatMethod.Navy);

        var bmi = TryDeurenberg(student.Gender, student.HeightCm, weightKg, student.DateOfBirth);
        if (bmi.HasValue)
            return (bmi, BodyFatMethod.BmiEstimate);

        return (null, null);
    }

    /// <summary>Preview without persisting manual override.</summary>
    public static decimal? Preview(Student student, BodyMeasurementsDto? measurementsCm, decimal? weightKg)
    {
        var navy = TryNavy(student.Gender, student.HeightCm, measurementsCm);
        if (navy.HasValue) return navy;
        return TryDeurenberg(student.Gender, student.HeightCm, weightKg, student.DateOfBirth);
    }

    static decimal? TryNavy(StudentGender gender, decimal? heightCm, BodyMeasurementsDto? m)
    {
        if (gender is not (StudentGender.Male or StudentGender.Female)) return null;
        if (heightCm is null or < 100m or > 250m) return null;
        if (m?.Neck is null or < 20m || m.Waist is null or < 40m) return null;

        var heightIn = (double)(heightCm.Value / ProgressMeasurementHelper.CmPerIn);
        var neckIn = (double)(m.Neck.Value / ProgressMeasurementHelper.CmPerIn);
        var waistIn = (double)(m.Waist.Value / ProgressMeasurementHelper.CmPerIn);

        double bf;
        if (gender == StudentGender.Male)
        {
            if (waistIn <= neckIn) return null;
            bf = 86.010 * Math.Log10(waistIn - neckIn) - 70.041 * Math.Log10(heightIn) + 36.76;
        }
        else
        {
            if (m.Hips is null or < 50m) return null;
            var hipIn = (double)(m.Hips.Value / ProgressMeasurementHelper.CmPerIn);
            if (waistIn + hipIn <= neckIn) return null;
            bf = 163.205 * Math.Log10(waistIn + hipIn - neckIn) - 97.684 * Math.Log10(heightIn) - 78.387;
        }

        if (double.IsNaN(bf) || double.IsInfinity(bf)) return null;
        return Math.Round((decimal)Math.Clamp(bf, 3, 60), 1);
    }

    static decimal? TryDeurenberg(StudentGender gender, decimal? heightCm, decimal? weightKg, DateTime? dateOfBirth)
    {
        if (gender is not (StudentGender.Male or StudentGender.Female)) return null;
        if (heightCm is null or <= 0 || weightKg is null or <= 0) return null;

        var age = AgeYears(dateOfBirth);
        if (age is null or < 10 or > 100) return null;

        var heightM = (double)(heightCm.Value / 100m);
        var bmi = (double)weightKg.Value / (heightM * heightM);
        var sex = gender == StudentGender.Male ? 1.0 : 0.0;
        var bf = 1.20 * bmi + 0.23 * age.Value - 10.8 * sex - 5.4;
        if (double.IsNaN(bf)) return null;
        return Math.Round((decimal)Math.Clamp(bf, 3, 60), 1);
    }

    public static int? AgeYears(DateTime? dateOfBirth)
    {
        if (dateOfBirth == null) return null;
        var dob = dateOfBirth.Value.Date;
        var today = DateTime.UtcNow.Date;
        var age = today.Year - dob.Year;
        if (dob > today.AddYears(-age)) age--;
        return age < 0 ? null : age;
    }

    public static string MethodLabel(BodyFatMethod? method) => method switch
    {
        BodyFatMethod.Navy => "US Navy (circumference)",
        BodyFatMethod.BmiEstimate => "BMI estimate",
        BodyFatMethod.Manual => "Manual entry",
        _ => "",
    };

    public static IReadOnlyList<string> RequiredFieldsForNavy(StudentGender gender)
    {
        var common = new List<string> { "Gender (male or female)", "Height", "Neck", "Waist" };
        if (gender == StudentGender.Female) common.Add("Hips");
        return common;
    }
}
