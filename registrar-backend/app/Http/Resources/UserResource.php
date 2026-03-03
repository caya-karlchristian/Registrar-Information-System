<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role_id' => $this->role_id,

            'student_profile' => $this->whenLoaded('studentProfile'),
            'academic_record' => $this->whenLoaded('academicRecord'),
        ];
    }
}