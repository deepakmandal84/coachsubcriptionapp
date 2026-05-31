namespace CoachSubscriptionApi.Entities;

public enum ProgressSource
{
    Coach,
    ParentPortal
}

public enum BodyFatMethod
{
    Manual,
    Navy,
    BmiEstimate
}

public enum MeasurementUnit
{
    Metric,
    Imperial
}

public class ProgressCheckIn
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public Guid StudentId { get; set; }
    public DateTime RecordedOn { get; set; }
    public decimal? WeightKg { get; set; }
    public decimal? BodyFatPercent { get; set; }
    public BodyFatMethod? BodyFatMethod { get; set; }
    /// <summary>JSON body measurements stored in centimeters.</summary>
    public string? MeasurementsJson { get; set; }
    public string? Notes { get; set; }
    public ProgressSource Source { get; set; }
    public Guid? CreatedByCoachId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Coach Coach { get; set; } = null!;
    public Student Student { get; set; } = null!;
}
