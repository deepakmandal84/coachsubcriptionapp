namespace CoachSubscriptionApi.DTOs;

public record BodyMeasurementsDto
{
    public decimal? Chest { get; init; }
    public decimal? Waist { get; init; }
    public decimal? Hips { get; init; }
    public decimal? Neck { get; init; }
    public decimal? LeftArm { get; init; }
    public decimal? RightArm { get; init; }
    public decimal? LeftThigh { get; init; }
    public decimal? RightThigh { get; init; }

    public bool IsEmpty() =>
        Chest == null && Waist == null && Hips == null && Neck == null &&
        LeftArm == null && RightArm == null && LeftThigh == null && RightThigh == null;
}

public record ProgressProfileDto(
    string Gender,
    decimal? Height,
    DateTime? DateOfBirth,
    int? AgeYears,
    string MeasurementUnit,
    IReadOnlyList<string> BodyFatRequiredFields);

public record UpdateProgressProfileRequest(
    string? Gender,
    decimal? Height,
    DateTime? DateOfBirth);

public record BodyFatPreviewRequest(
    decimal? Weight,
    BodyMeasurementsDto? Measurements);

public record BodyCompositionBreakdownDto(
    decimal? NavyPercent,
    decimal? BmiPercent,
    string? Category,
    decimal? IdealPercent,
    decimal? FatMass,
    decimal? LeanMass,
    decimal? FatToLose,
    string MassUnit);

public record BodyFatPreviewDto(
    decimal? CalculatedPercent,
    string? Method,
    IReadOnlyList<string> MissingFields,
    BodyCompositionBreakdownDto? Breakdown = null);

public record ProgressCheckInDto(
    Guid Id,
    DateTime RecordedOn,
    decimal? Weight,
    decimal? BodyFatPercent,
    string? BodyFatMethod,
    BodyMeasurementsDto? Measurements,
    string? Notes,
    string Source,
    DateTime CreatedAt);

public record CreateProgressCheckInRequest(
    DateTime RecordedOn,
    decimal? Weight,
    decimal? BodyFatPercent,
    BodyMeasurementsDto? Measurements,
    string? Notes);

public record UpdateProgressCheckInRequest(
    DateTime RecordedOn,
    decimal? Weight,
    decimal? BodyFatPercent,
    BodyMeasurementsDto? Measurements,
    string? Notes);

public record UpdateStudentMeasurementUnitRequest(string MeasurementUnit);

public record ProgressChartPointDto(string Label, decimal Value);

public record ProgressChartDto(
    string MeasurementUnit,
    List<ProgressChartPointDto> Weight,
    List<ProgressChartPointDto> BodyFat,
    List<ProgressChartPointDto> Waist,
    List<ProgressChartPointDto> Chest,
    List<ProgressChartPointDto> Hips);

public record ProgressDeltaDto(
    DateTime LatestRecordedOn,
    decimal? LatestWeight,
    decimal? LatestBodyFatPercent,
    string? LatestBodyFatMethod,
    decimal? WeightChangeSincePrevious,
    decimal? BodyFatChangeSincePrevious);

public record StudentProgressSummaryDto(
    Guid StudentId,
    string StudentName,
    ProgressProfileDto Profile,
    ProgressDeltaDto? LatestDelta,
    ProgressChartDto Chart,
    List<ProgressCheckInDto> Entries);

public record ParentProgressViewDto(
    string StudentName,
    string AcademyName,
    ProgressProfileDto Profile,
    ProgressDeltaDto? LatestDelta,
    ProgressChartDto Chart,
    List<ProgressCheckInDto> Entries);
