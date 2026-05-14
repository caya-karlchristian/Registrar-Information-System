<?php

namespace Database\Factories;

use App\Models\SystemUser;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class SystemUserFactory extends Factory
{
    protected $model = SystemUser::class;

    public function definition(): array
    {
        return [
            'email'    => $this->faker->unique()->safeEmail(),
            'password' => bcrypt('password'),
            'role_id'  => SystemUser::ROLE_STUDENT,
            'status'   => 'Activated',
        ];
    }
}
