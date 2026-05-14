<?php

namespace Database\Factories;

use App\Models\StudentAcademicRecord;
use App\Models\StudentProfile;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentAcademicRecordFactory extends Factory
{
    protected $model = StudentAcademicRecord::class;

    public function definition(): array
    {
        return [
            'student_profile_id' => StudentProfile::factory(),
            'student_number'     => $this->faker->unique()->numerify('20##-#####'),
            'course'             => $this->faker->randomElement(['BSCS', 'BSIT', 'BSCpE']),
            'year_level'         => $this->faker->numberBetween(1, 4),
        ];
    }
}
