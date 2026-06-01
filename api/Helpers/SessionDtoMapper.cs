using CoachSubscriptionApi.DTOs;
using CoachSubscriptionApi.Entities;

namespace CoachSubscriptionApi.Helpers;

public static class SessionDtoMapper
{
    public static string FormatStartTime(TimeSpan startTime) =>
        $"{startTime.Hours:D2}:{startTime.Minutes:D2}";

    public static SessionListDto ToListDto(
        Guid id,
        DateTime date,
        TimeSpan startTime,
        SessionType type,
        string title,
        string? location,
        DateTime createdAt,
        int bookingCount,
        int attendanceCount,
        List<Guid> coachIds,
        List<string> coachNames) =>
        new(
            id,
            SessionDateHelper.FormatDateOnly(date),
            FormatStartTime(startTime),
            type.ToString(),
            title,
            location,
            createdAt,
            bookingCount,
            attendanceCount,
            coachIds,
            coachNames);

    public static SessionDetailDto ToDetailDto(
        Session session,
        List<SessionBookingDto> bookings,
        List<AttendanceDto> attendances,
        List<AssignedCoachDto> assigned,
        bool canMark) =>
        new(
            session.Id,
            SessionDateHelper.FormatDateOnly(session.Date),
            FormatStartTime(session.StartTime),
            session.Type.ToString(),
            session.Title,
            session.Location,
            bookings,
            attendances,
            assigned,
            session.CreatedAt,
            canMark);
}
