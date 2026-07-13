<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\SystemUser;
use Illuminate\Support\Facades\DB;

/**
 * Owns the business logic for announcements.
 *
 * Creating an announcement has a side-effect (broadcast notification
 * to all non-superadmin users). That side-effect belongs here, not
 * in the controller, so the controller stays a thin HTTP adapter.
 */
class AnnouncementService
{
    public function __construct(
        private NotificationService $notificationService,
    ) {}

    public function create(array $validated, SystemUser $author): Announcement
    {
        $announcement = Announcement::create([
            'title'      => $validated['title'],
            'content'    => $validated['content'],
            'enabled'    => true,
            'end_date'   => $validated['end_date'] ?? null,
            'created_by' => $author->user_id,
        ]);

        $this->notificationService->sendToAllExcept(
            excludedRoleIds: [SystemUser::ROLE_SUPER_ADMIN],
            triggerEvent:    'announcement_published',
            data: [
                'announcement_id'      => $announcement->id,
                'announcement_title'   => $announcement->title,
                'announcement_content' => $announcement->content,
            ],
        );

        return $announcement;
    }

    /**
     * Archive an announcement.
     *
     * Per the Announcement Archive policy: enable/disable is a temporary
     * visibility switch staff flip often; archive is a bigger, less
     * frequent action, and only makes sense once the announcement is
     * already Disabled — you can't archive something still live and
     * visible to users.
     *
     * @throws \RuntimeException if the announcement is still enabled.
     */
    public function archive(Announcement $announcement, SystemUser $actor): Announcement
    {
        return DB::transaction(function () use ($announcement, $actor) {
            $announcement = Announcement::withArchived()
                ->lockForUpdate()
                ->findOrFail($announcement->id);

            if ($announcement->enabled) {
                throw new \RuntimeException(
                    'This announcement is still enabled. Disable it first before archiving.'
                );
            }

            if (!$announcement->is_archived) {
                $announcement->update([
                    'is_archived' => true,
                    'archived_on' => now(),
                    'archived_by' => $actor->user_id,
                ]);
            }

            return $announcement;
        });
    }

    /**
     * Restore an announcement.
     *
     * Always comes back Disabled — never instantly live again — so an old
     * announcement can't suddenly reappear to users the moment it's
     * restored. Staff still choose when to re-enable it.
     */
    public function restore(Announcement $announcement, SystemUser $actor): Announcement
    {
        return DB::transaction(function () use ($announcement) {
            $announcement = Announcement::withArchived()
                ->lockForUpdate()
                ->findOrFail($announcement->id);

            if ($announcement->is_archived) {
                $announcement->update([
                    'is_archived' => false,
                    'archived_on' => null,
                    'archived_by' => null,
                    'enabled'     => false,
                ]);
            }

            return $announcement;
        });
    }
}