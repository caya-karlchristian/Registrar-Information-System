<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\SystemUser;

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
}
