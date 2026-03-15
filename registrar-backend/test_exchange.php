<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://identity-provider.isaxbsit2027.com/api/v1/auth/token");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["client_id" => "58f5b2b3-a5fb-4c63-a5c1-18604c38d0d7", "client_secret" => getenv("SSO_CLIENT_SECRET"), "code" => $argv[1] ?? "test"]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
echo curl_exec($ch) . "\n";
echo "Secret: [" . substr(getenv("SSO_CLIENT_SECRET"), 0, 8) . "...]\n";
