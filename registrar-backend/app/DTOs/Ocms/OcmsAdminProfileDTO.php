<?php

namespace App\DTOs\Ocms;

/**
 * Maps the OCMS External Admin Profile API response to a typed object.
 *
 * OCMS data dictionary (from spec):
 * {
 *   admin_id:                  string,   ← IDP user ID used for lookup
 *   first_name:                string,
 *   middle_name:                string,
 *   last_name:                 string,
 *   suffix_name:               string,
 *   name:                      string,   ← full display name (not stored separately)
 *   email:                     string,
 *   birthday:                  string,   ← YYYY-MM-DD
 *   age:                       int,
 *   gender:                    string,
 *   civil_status:              string,
 *   address:                   string,
 *   contact_no:                string,   ← may be keyed as emergency_contact_no
 *   emergency_contact_person:  string,
 *   office:                    string,
 *   access_level:              string,
 *   status:                    string,
 *   last_updated:              string,
 * }
 *
 * NOTE: field names confirmed from the OCMS API spec doc (Mar 2026).
 * Update fromArray() if the live API diverges from the spec.
 */
readonly class OcmsAdminProfileDTO
{
    public function __construct(
        public string  $adminId,
        public string  $firstName,
        public ?string $middleName,
        public string  $lastName,
        public ?string $suffix,
        public ?string $office,
        public ?string $contactNo,
        public ?string $emergencyContactPerson,
        public ?string $birthday,
        public ?string $gender,
        public ?string $civilStatus,
        public ?string $address,
        public ?string $accessLevel,
        public ?string $status,
    ) {}

    /**
     * Build from the OCMS API response.
     * Handles both direct responses and { data: {...} } envelope shapes.
     */
    public static function fromArray(array $data): self
    {
        // Unwrap envelope if present
        $profile = $data['data'] ?? $data;

        return new self(
            adminId:                $profile['admin_id']                 ?? '',
            firstName:              $profile['first_name']               ?? '',
            middleName:             self::nullableString($profile['middle_name']              ?? null),
            lastName:               $profile['last_name']                ?? '',
            suffix:                 self::nullableString($profile['suffix_name']              ?? null),
            office:                 self::nullableString($profile['office']                   ?? null),
            // OCMS spec lists both contact_no and emergency_contact_no — accept either
            contactNo:              self::nullableString($profile['contact_no']
                                                      ?? $profile['emergency_contact_no']    ?? null),
            emergencyContactPerson: self::nullableString($profile['emergency_contact_person'] ?? null),
            birthday:               self::nullableString($profile['birthday']                 ?? null),
            gender:                 self::nullableString($profile['gender']                   ?? null),
            civilStatus:            self::nullableString($profile['civil_status']             ?? null),
            address:                self::nullableString($profile['address']                  ?? null),
            accessLevel:            self::nullableString($profile['access_level']             ?? null),
            status:                 self::nullableString($profile['status']                   ?? null),
        );
    }

    /**
     * Map DTO fields → local admin_profile column names.
     * Only non-null values are returned so callers can use this
     * directly with updateOrCreate() without overwriting existing data.
     */
    public function toLocalArray(): array
    {
        return array_filter([
            'first_name'               => $this->firstName   ?: null,
            'middle_name'              => $this->middleName,
            'last_name'                => $this->lastName     ?: null,
            'suffix'                   => $this->suffix,
            'office'                   => $this->office,
            'contact_no'               => $this->contactNo,
            'emergency_contact_person' => $this->emergencyContactPerson,
            'birthday'                 => $this->birthday,
            'gender'                   => $this->gender,
            'civil_status'             => $this->civilStatus,
            'address'                  => $this->address,
        ], fn ($v) => !is_null($v));
    }

    public function fullName(): string
    {
        return implode(' ', array_filter([
            $this->firstName,
            $this->middleName,
            $this->lastName,
            $this->suffix,
        ]));
    }

    private static function nullableString(mixed $value): ?string
    {
        // Treat empty string as null — consistent with OgosStudentDTO
        return ($value !== null && $value !== '') ? (string) $value : null;
    }
}
