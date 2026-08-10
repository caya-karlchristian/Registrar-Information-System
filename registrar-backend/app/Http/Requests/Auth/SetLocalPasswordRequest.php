<?php

namespace App\Http\Requests\Auth;

use App\Models\SystemUser;
use Illuminate\Foundation\Http\FormRequest;

class SetLocalPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route is already gated by ['auth:sanctum', 'role:4'] middleware
        // (routes/api.php). This check is defense-in-depth, matching the
        // pattern used elsewhere (e.g. SystemUserPolicy) — cheap to keep
        // and means this class stays correct even if the route
        // middleware is ever refactored.
        return $this->user()?->role_id === SystemUser::ROLE_SUPER_ADMIN;
    }

    public function rules(): array
    {
        return [
            // Break-glass access is deliberately restricted to a small,
            // watched set of accounts (Super Admins only) rather than
            // being an option on every admin — see LocalAuthService docblock.
            // This rule enforces that at the point local auth is actually
            // enabled/updated for a target, regardless of what the UI sends.
            'user_id' => [
                'required',
                'integer',
                'exists:users,user_id',
                function (string $attribute, mixed $value, \Closure $fail) {
                    /** @var SystemUser|null $target */
                    $target = SystemUser::find($value);

                    if ($target && $target->role_id !== SystemUser::ROLE_SUPER_ADMIN) {
                        $fail('Local fallback access is limited to Super Admin accounts.');
                    }
                },
            ],
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required|string',
        ];
    }
}
