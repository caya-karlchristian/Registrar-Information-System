<?php

namespace App\Http\Resources;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Transforms a single Notification model into the API shape.
 *
 * Previously this was an anonymous closure inside
 * NotificationController::index(). Extracting it here lets
 * it be reused, tested, and changed in one place.
 *
 * Requires the 'type' relation to be eager-loaded before use.
 */
class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        /** @var Notification $this */
        return [
            'id'         => $this->id,
            'title'      => $this->type->title,
            'message'    => $this->data['message'] ?? '',
            'type'       => $this->type->trigger_event,
            'request_id' => $this->request_id,
            'read_at'    => $this->read_at?->toISOString(),
            'created_at' => $this->created_at->toISOString(),
            'is_unread'  => is_null($this->read_at),
            'announcement' => isset($this->data['announcement_id']) ? [
                'id'      => $this->data['announcement_id'],
                'title'   => $this->data['announcement_title'],
                'content' => $this->data['announcement_content'],
            ] : null,
        ];
    }
}
