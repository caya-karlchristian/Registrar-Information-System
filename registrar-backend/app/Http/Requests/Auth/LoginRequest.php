<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Shared by AuthController::login() (IDP-first, with local fallback) and
 * LocalAuthController::login() (always-local) — both had byte-for-byte
 * identical validation, so one class covers both instead of two
 * near-duplicates.
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Public endpoint — anyone may attempt to log in. The real
        // authorization (are these credentials valid) happens inside
        // SsoAuthService / LocalAuthService, not here.
        return true;
    }

    public function rules(): array
    {
        return [
            'email'    => 'required|email',
            'password' => 'required|string',
        ];
    }
}
