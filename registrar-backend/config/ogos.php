<?php

return [
    /*
    |--------------------------------------------------------------------------
    | OGOS Registrar API
    |--------------------------------------------------------------------------
    | Machine-to-machine credentials for the OGOS student registry.
    | All values must be set in .env — never hard-code secrets here.
    */
    'base_url'      => env('OGOS_BASE_URL', 'https://api.pupt-ogos.dllbsit2027.com/api/v1'),
    'client_id'     => env('OGOS_CLIENT_ID'),
    'client_secret' => env('OGOS_CLIENT_SECRET'),
];
