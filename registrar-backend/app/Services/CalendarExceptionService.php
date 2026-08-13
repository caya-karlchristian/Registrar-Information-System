<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\BusinessCalendarHoliday;
use App\Models\SystemUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns the business logic for one-off dated calendar closures — holidays,
 * suspensions, and events (fumigation, team-building). Kept separate from
 * CalendarOverrideController's HTTP layer so overlap validation and audit
 * logging live in exactly one place, same reasoning as AnnouncementService.
 */
class CalendarExceptionService
{
    public function __construct(
        private BusinessCalendarService $calendarService,
        private AuditLogger $auditLogger,
    ) {}

    public function create(array $validated, SystemUser $actor, Request $request): BusinessCalendarHoliday
    {
        $calendarId = $validated['calendar_id'] ?? $this->calendarService->defaultCalendar()->calendar_id;
        $endDate = $validated['end_date'] ?? $validated['date'];

        $this->assertNoOverlap($calendarId, $validated['date'], $endDate);

        $exception = BusinessCalendarHoliday::create([
            'calendar_id' => $calendarId,
            'type'        => $validated['type'],
            'label'       => $validated['label'],
            'date'        => $validated['date'],
            'end_date'    => $endDate,
        ]);

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_CALENDAR_EXCEPTION_CREATED, [
            'exception_id' => $exception->holiday_id,
            'label'        => $exception->label,
            'date'         => $exception->date->toDateString(),
            'end_date'     => $exception->end_date->toDateString(),
        ]);

        return $exception;
    }

    public function update(BusinessCalendarHoliday $exception, array $validated, SystemUser $actor, Request $request): BusinessCalendarHoliday
    {
        $wasSingleDay = $exception->date->equalTo($exception->end_date);

        $date = $validated['date'] ?? $exception->date->toDateString();

        // Only auto-follow the new start date when this was already a
        // single-day closure — moving the start date of a *range* must
        // never silently shrink it down to one day just because end_date
        // wasn't part of this particular request. If the caller wants to
        // change the range's length, they send end_date explicitly.
        $endDate = $validated['end_date']
            ?? ($wasSingleDay ? $date : $exception->end_date->toDateString());

        if ($endDate < $date) {
            throw ValidationException::withMessages([
                'end_date' => 'End date can\'t be before the (possibly newly updated) start date.',
            ]);
        }

        $this->assertNoOverlap($exception->calendar_id, $date, $endDate, excludeId: $exception->holiday_id);

        $exception->update(array_merge($validated, [
            'date'     => $date,
            'end_date' => $endDate,
        ]));

        $this->auditLogger->log($request, $actor, AuditLog::ACTION_CALENDAR_EXCEPTION_UPDATED, [
            'exception_id' => $exception->holiday_id,
            'label'        => $exception->label,
        ]);

        return $exception->refresh();
    }

    public function delete(BusinessCalendarHoliday $exception, SystemUser $actor, Request $request): void
    {
        DB::transaction(function () use ($exception, $actor, $request) {
            $this->auditLogger->log($request, $actor, AuditLog::ACTION_CALENDAR_EXCEPTION_DELETED, [
                'exception_id' => $exception->holiday_id,
                'label'        => $exception->label,
                'date'         => $exception->date->toDateString(),
                'end_date'     => $exception->end_date->toDateString(),
            ]);

            $exception->delete();
        });
    }

    /**
     * Two exceptions on the same calendar shouldn't cover the same date —
     * an overlap is almost certainly a duplicate entry (someone declaring
     * "Aug 14 fumigation" twice) rather than an intentional stack, and
     * silently allowing it would make upcomingClosures() show the same day
     * twice with two different labels. Caught as a normal 422 validation
     * error, same shape as any other form-validation failure.
     */
    private function assertNoOverlap(int $calendarId, string $date, string $endDate, ?int $excludeId = null): void
    {
        $overlap = BusinessCalendarHoliday::where('calendar_id', $calendarId)
            ->where('date', '<=', $endDate)
            ->where('end_date', '>=', $date)
            ->when($excludeId, fn ($query) => $query->where('holiday_id', '!=', $excludeId))
            ->exists();

        if ($overlap) {
            throw ValidationException::withMessages([
                'date' => 'This date range overlaps an existing closure already declared for this calendar.',
            ]);
        }
    }
}