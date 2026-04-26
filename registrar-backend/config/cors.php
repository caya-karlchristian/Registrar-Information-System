<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost',
        'https://localhost',
        'https://d38uplsfjqa5i6.cloudfront.net',
        'https://registrar-information-system-bsit2027.com',              
        'http://13.250.214.23',              
        'http://pupt-ris.registrar-information-system-bsit2027.com',
        'https://pupt-ris.registrar-information-system-bsit2027.com',
        'http://localhost:5173'

    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
