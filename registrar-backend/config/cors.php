<?php
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://localhost',
        'https://localhost',
        'https://d1234abcdef.cloudfront.net',  
        'https://registrar-information-system-bsit2027.com',              
        'http://13.250.214.23',              
        'https://pupt-ris.registrar-information-system.com'

    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
