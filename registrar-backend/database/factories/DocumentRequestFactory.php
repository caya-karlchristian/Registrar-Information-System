<?php

namespace Database\Factories;

use App\Enums\RequestStatusEnum;
use App\Models\DocumentRequest;
use App\Models\RequestPurpose;
use App\Models\StudentAcademicRecord;
use App\Models\StudentProfile;
use App\Models\SystemUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class DocumentRequestFactory extends Factory
{
    protected $model = DocumentRequest::class;

    public function definition(): array
    {
        return [
            'user_id'            => SystemUser::factory(),
            'status_id'          => RequestStatusEnum::Processing->value,
            'request_purpose_id' => RequestPurpose::firstOrCreate(
                ['request_purpose_id' => 1],
                ['purpose_name'       => 'DFA']
            )->request_purpose_id,
            'or_number'          => $this->faker->numerify('#######'),
            'receipt_date'       => now()->toDateString(),
            'requested_at'       => now(),
            'uuid'               => (string) Str::uuid(),
        ];
    }
}
