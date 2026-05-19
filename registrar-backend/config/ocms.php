<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OCMS Central Admin Profile Hub
    |--------------------------------------------------------------------------
    | Machine-to-machine credentials for the OCMS admin profile API.
    | Issued by the Innovision team — request via Justin Recohermoso.
    | All values must be set in .env — never hard-code secrets here.
    */
    'base_url'      => env('OCMS_BASE_URL', ''),
    'client_id'     => env('OCMS_CLIENT_ID', ''),
    'client_secret' => env('OCMS_CLIENT_SECRET', ''),
];
