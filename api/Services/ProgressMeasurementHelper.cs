using System.Text.Json;
using System.Text.Json.Serialization;
using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Services;

public static class ProgressMeasurementHelper
{
    static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public const decimal LbPerKg = 2.2046226218m;
    public const decimal CmPerIn = 2.54m;

    public static decimal? KgFromUserWeight(decimal? weight, MeasurementUnit unit)
    {
        if (weight == null) return null;
        return unit == MeasurementUnit.Imperial ? Math.Round(weight.Value / LbPerKg, 3) : weight;
    }

    public static decimal? UserWeightFromKg(decimal? kg, MeasurementUnit unit)
    {
        if (kg == null) return null;
        return unit == MeasurementUnit.Imperial ? Math.Round(kg.Value * LbPerKg, 2) : Math.Round(kg.Value, 2);
    }

    public static BodyMeasurementsDto? ParseMeasurements(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            var raw = JsonSerializer.Deserialize<BodyMeasurementsDto>(json, JsonOpts);
            return raw;
        }
        catch
        {
            return null;
        }
    }

    public static string? SerializeMeasurements(BodyMeasurementsDto? m)
    {
        if (m == null || m.IsEmpty()) return null;
        return JsonSerializer.Serialize(m, JsonOpts);
    }

    public static BodyMeasurementsDto? ToDisplayMeasurements(BodyMeasurementsDto? cm, MeasurementUnit unit)
    {
        if (cm == null) return null;
        if (unit == MeasurementUnit.Metric) return cm;
        return new BodyMeasurementsDto
        {
            Chest = InFromCm(cm.Chest),
            Waist = InFromCm(cm.Waist),
            Hips = InFromCm(cm.Hips),
            Neck = InFromCm(cm.Neck),
            LeftArm = InFromCm(cm.LeftArm),
            RightArm = InFromCm(cm.RightArm),
            LeftThigh = InFromCm(cm.LeftThigh),
            RightThigh = InFromCm(cm.RightThigh),
        };
    }

    public static BodyMeasurementsDto? FromUserMeasurements(BodyMeasurementsDto? user, MeasurementUnit unit)
    {
        if (user == null || user.IsEmpty()) return null;
        if (unit == MeasurementUnit.Metric) return user;
        return new BodyMeasurementsDto
        {
            Chest = CmFromIn(user.Chest),
            Waist = CmFromIn(user.Waist),
            Hips = CmFromIn(user.Hips),
            Neck = CmFromIn(user.Neck),
            LeftArm = CmFromIn(user.LeftArm),
            RightArm = CmFromIn(user.RightArm),
            LeftThigh = CmFromIn(user.LeftThigh),
            RightThigh = CmFromIn(user.RightThigh),
        };
    }

    static decimal? CmFromIn(decimal? inches) =>
        inches == null ? null : Math.Round(inches.Value * CmPerIn, 2);

    static decimal? InFromCm(decimal? cm) =>
        cm == null ? null : Math.Round(cm.Value / CmPerIn, 2);

    public static decimal? UserHeightFromCm(decimal? cm, MeasurementUnit unit)
    {
        if (cm == null) return null;
        return unit == MeasurementUnit.Imperial ? InFromCm(cm) : Math.Round(cm.Value, 1);
    }

    public static decimal? CmFromUserHeight(decimal? height, MeasurementUnit unit)
    {
        if (height == null) return null;
        return unit == MeasurementUnit.Imperial ? CmFromIn(height) : height;
    }

    public static ProgressProfileDto ToProfileDto(Student student)
    {
        var gender = student.Gender;
        return new ProgressProfileDto(
            gender.ToString(),
            UserHeightFromCm(student.HeightCm, student.MeasurementUnit),
            student.DateOfBirth,
            BodyFatCalculator.AgeYears(student.DateOfBirth),
            student.MeasurementUnit.ToString(),
            BodyFatCalculator.RequiredFieldsForNavy(gender));
    }

    public static void ApplyProfileUpdate(Student student, UpdateProgressProfileRequest request)
    {
        if (request.Gender != null && Enum.TryParse<StudentGender>(request.Gender, true, out var g))
            student.Gender = g;
        if (request.Height.HasValue)
            student.HeightCm = CmFromUserHeight(request.Height, student.MeasurementUnit);
        if (request.DateOfBirth.HasValue)
            student.DateOfBirth = DateTime.SpecifyKind(request.DateOfBirth.Value.Date, DateTimeKind.Utc);
    }

    public static ProgressCheckInDto ToDto(ProgressCheckIn e, MeasurementUnit unit)
    {
        var cm = ParseMeasurements(e.MeasurementsJson);
        return new ProgressCheckInDto(
            e.Id,
            e.RecordedOn,
            UserWeightFromKg(e.WeightKg, unit),
            e.BodyFatPercent,
            e.BodyFatMethod?.ToString(),
            ToDisplayMeasurements(cm, unit),
            e.Notes,
            e.Source.ToString(),
            e.CreatedAt);
    }

    public static void ApplyBodyFat(ProgressCheckIn entry, Student student, CreateProgressCheckInRequest request)
    {
        var measurementsCm = FromUserMeasurements(request.Measurements, student.MeasurementUnit);
        var weightKg = KgFromUserWeight(request.Weight, student.MeasurementUnit);
        var (bf, method) = BodyFatCalculator.Resolve(request.BodyFatPercent, student, measurementsCm, weightKg);
        entry.BodyFatPercent = bf;
        entry.BodyFatMethod = method;
    }

    public static void ApplyCheckInMetrics(ProgressCheckIn entry, Student student, CreateProgressCheckInRequest request)
    {
        entry.WeightKg = KgFromUserWeight(request.Weight, student.MeasurementUnit);
        entry.MeasurementsJson = SerializeMeasurements(FromUserMeasurements(request.Measurements, student.MeasurementUnit));
        entry.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        ApplyBodyFat(entry, student, request);
    }

    public static StudentProgressSummaryDto BuildStudentSummary(Student student, List<ProgressCheckIn> entries)
    {
        var ordered = entries.OrderByDescending(e => e.RecordedOn).ThenByDescending(e => e.CreatedAt).ToList();
        var latest = ordered.FirstOrDefault();
        var previous = ordered.Skip(1).FirstOrDefault();
        return new StudentProgressSummaryDto(
            student.Id,
            student.Name,
            ToProfileDto(student),
            BuildDelta(latest, previous, student.MeasurementUnit),
            BuildChart(entries.OrderBy(e => e.RecordedOn).ToList(), student.MeasurementUnit),
            ordered.Select(e => ToDto(e, student.MeasurementUnit)).ToList());
    }

    public static ParentProgressViewDto BuildParentView(Student student, string academyName, List<ProgressCheckIn> entries)
    {
        var ordered = entries.OrderByDescending(e => e.RecordedOn).ThenByDescending(e => e.CreatedAt).ToList();
        var latest = ordered.FirstOrDefault();
        var previous = ordered.Skip(1).FirstOrDefault();
        return new ParentProgressViewDto(
            student.Name,
            academyName,
            ToProfileDto(student),
            BuildDelta(latest, previous, student.MeasurementUnit),
            BuildChart(entries.OrderBy(e => e.RecordedOn).ToList(), student.MeasurementUnit),
            ordered.Select(e => ToDto(e, student.MeasurementUnit)).ToList());
    }

    public static void ApplyStudentDemographics(Student student, string? gender, decimal? height, DateTime? dateOfBirth, MeasurementUnit? unitOverride = null)
    {
        if (gender != null && Enum.TryParse<StudentGender>(gender, true, out var g))
            student.Gender = g;
        if (height.HasValue)
            student.HeightCm = CmFromUserHeight(height, unitOverride ?? student.MeasurementUnit);
        if (dateOfBirth.HasValue)
            student.DateOfBirth = DateTime.SpecifyKind(dateOfBirth.Value.Date, DateTimeKind.Utc);
    }

    public static StudentDetailDto ToStudentDetailDto(Student x) =>
        new(
            x.Id, x.Name, x.ParentName, x.Email, x.Phone, x.Notes, x.Tags, x.Status.ToString(),
            x.MeasurementUnit.ToString(), x.Gender.ToString(),
            UserHeightFromCm(x.HeightCm, x.MeasurementUnit), x.DateOfBirth,
            BodyFatCalculator.AgeYears(x.DateOfBirth), x.CreatedAt);

    public static ProgressChartDto BuildChart(IReadOnlyList<ProgressCheckIn> entries, MeasurementUnit unit)
    {
        var ordered = entries.OrderBy(e => e.RecordedOn).ThenBy(e => e.CreatedAt).ToList();
        var weight = new List<ProgressChartPointDto>();
        var bodyFat = new List<ProgressChartPointDto>();
        var waist = new List<ProgressChartPointDto>();
        var chest = new List<ProgressChartPointDto>();
        var hips = new List<ProgressChartPointDto>();

        foreach (var e in ordered)
        {
            var label = e.RecordedOn.ToString("yyyy-MM-dd");
            var w = UserWeightFromKg(e.WeightKg, unit);
            if (w != null) weight.Add(new ProgressChartPointDto(label, w.Value));
            if (e.BodyFatPercent != null) bodyFat.Add(new ProgressChartPointDto(label, e.BodyFatPercent.Value));
            var m = ParseMeasurements(e.MeasurementsJson);
            var display = ToDisplayMeasurements(m, unit);
            if (display?.Waist != null) waist.Add(new ProgressChartPointDto(label, display.Waist.Value));
            if (display?.Chest != null) chest.Add(new ProgressChartPointDto(label, display.Chest.Value));
            if (display?.Hips != null) hips.Add(new ProgressChartPointDto(label, display.Hips.Value));
        }

        return new ProgressChartDto(unit.ToString(), weight, bodyFat, waist, chest, hips);
    }

    public static ProgressDeltaDto? BuildDelta(ProgressCheckIn? latest, ProgressCheckIn? previous, MeasurementUnit unit)
    {
        if (latest == null) return null;
        decimal? weightDelta = null;
        decimal? bodyFatDelta = null;
        if (previous != null)
        {
            if (latest.WeightKg != null && previous.WeightKg != null)
                weightDelta = UserWeightFromKg(latest.WeightKg, unit) - UserWeightFromKg(previous.WeightKg, unit);
            if (latest.BodyFatPercent != null && previous.BodyFatPercent != null)
                bodyFatDelta = latest.BodyFatPercent - previous.BodyFatPercent;
        }

        return new ProgressDeltaDto(
            latest.RecordedOn,
            UserWeightFromKg(latest.WeightKg, unit),
            latest.BodyFatPercent,
            latest.BodyFatMethod?.ToString(),
            weightDelta,
            bodyFatDelta);
    }
}
