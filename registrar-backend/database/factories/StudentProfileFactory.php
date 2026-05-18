<?php

namespace Database\Factories;

use App\Models\StudentProfile;
use App\Models\SystemUser;
use Illuminate\Database\Eloquent\Factories\Factory;

class StudentProfileFactory extends Factory
{
    protected $model = StudentProfile::class;

    public function definition(): array
    {
        return [
            'user_id'       => SystemUser::factory(),
            'first_name'    => $this->faker->firstName(),
            'middle_name'   => $this->faker->optional()->lastName(),
            'last_name'     => $this->faker->lastName(),
            'date_of_birth' => $this->faker->date('Y-m-d', '-18 years'),
            'sex_at_birth'  => $this->faker->randomElement(['Male', 'Female']),
        ];
    }
}
