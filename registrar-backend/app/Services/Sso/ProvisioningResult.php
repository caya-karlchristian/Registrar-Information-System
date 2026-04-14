<?php

namespace App\Services\Sso;

use App\Models\SystemUser;

class ProvisioningResult
{
    public function __construct(
        public readonly SystemUser $user,
        public readonly bool $needsOnboarding,
    ) {}
}