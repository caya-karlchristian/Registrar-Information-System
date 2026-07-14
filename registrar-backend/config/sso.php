<?php

return [
    'base_url'            => env('SSO_BASE_URL', ''),
    'client_id'           => env('SSO_CLIENT_ID', ''),
    'client_secret'       => env('SSO_CLIENT_SECRET', ''),
    // Static API key required (alongside the superadmin bearer token) by the
    // IdP's admin-management endpoints (POST/PATCH/DELETE /api/v1/user...).
    // Sent as the `x-api-key` header — see IdpClient's admin-management calls.
    'api_key'             => env('SSO_API_KEY', ''),
    'superadmin_email'    => env('SSO_SUPERADMIN_EMAIL', ''),
    'superadmin_password' => env('SSO_SUPERADMIN_PASSWORD', ''),
];