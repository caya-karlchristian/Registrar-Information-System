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
            // course_id is NOT NULL with a foreign key into `programs`
            // (see fix_course_fk_and_history_index migration) — the
            // original version of this factory never set it, which
            // only worked as long as nothing actually ran the seed
            // path end-to-end. Programs must be seeded first (see
            // DatabaseSeeder::seedPrograms()) — these IDs match that
            // seed data.
            'course_id'           => $this->faker->randomElement([1, 2, 3, 4, 5, 6, 8, 9, 10, 11]),
            'course'              => $this->faker->randomElement(['BSCS', 'BSIT', 'BSCpE']),
            'year_level'          => $this->faker->numberBetween(1, 4),
        ];
    }
}