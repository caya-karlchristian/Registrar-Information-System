<?php

namespace App\DTOs\Ogos;

/**
 * Maps the OGOS student response to a typed object.
 *
 * Confirmed real response structure (flat — NOT nested):
 * {
 *   studentNumber: string,
 *   firstName:     string,
 *   middleName:    string,   ← plain string, empty string when absent
 *   lastName:      string,
 *   email:         string,
 *   mobileNumber:  string,
 *   course:        { id, code, name },
 *   yearLevel:     integer,
 *   section:       string,   ← string, not integer ("1", "2A", etc.)
 * }
 *
 * Extended fields (dateOfBirth, gender, heightFt, weightKg, etc.)
 * come from the separate /personal-info endpoint → OgosPersonalInfoDTO.
 *
 * fromArray() accepts a single flat student object from either:
 *   - GET /integrations/students/{studentNumber}
 *   - GET /integrations/students/profile?email=
 *   - Items inside GET /integrations/students/profiles → data.students[]
 */
readonly class OgosStudentDTO
{
    public function __construct(
        public string  $studentNumber,
        public string  $email,
        public string  $firstName,
        public ?string $middleName,
        public string  $lastName,
        public ?string $mobileNumber,
        public ?int    $courseId,
        public ?string $courseCode,
        public ?string $courseName,
        public ?int    $yearLevel,
        public ?string $section,       // string in real API ("1", "2A", etc.)

        // Fields only available from /personal-info — null unless enriched
        public ?string $suffix       = null,
        public ?string $gender       = null,
        public ?string $civilStatus  = null,
        public ?string $religion     = null,
        public ?string $dateOfBirth  = null,
        public ?string $placeOfBirth = null,
        public ?float  $heightFt     = null,
        public ?float  $weightKg     = null,
    ) {}

    /**
     * Build from a single flat OGOS student object.
     */
    public static function fromArray(array $data): self
    {
        return new self(
            studentNumber: $data['studentNumber'] ?? '',
            email:         $data['email']         ?? '',
            firstName:     $data['firstName']     ?? '',
            middleName:    self::nullableString($data['middleName'] ?? null),
            lastName:      $data['lastName']      ?? '',
            mobileNumber:  self::nullableString($data['mobileNumber'] ?? null),

            courseId:   $data['course']['id']   ?? null,
            courseCode: $data['course']['code'] ?? null,
            courseName: $data['course']['name'] ?? null,

            yearLevel: isset($data['yearLevel']) ? (int) $data['yearLevel'] : null,
            section:   self::nullableString($data['section'] ?? null),
        );
    }

    public function toArray(): array
    {
        return [
            'student_number' => $this->studentNumber,
            'email'          => $this->email,
            'first_name'     => $this->firstName,
            'middle_name'    => $this->middleName,
            'last_name'      => $this->lastName,
            'mobile_number'  => $this->mobileNumber,
            'course_id'      => $this->courseId,
            'course_code'    => $this->courseCode,
            'course_name'    => $this->courseName,
            'year_level'     => $this->yearLevel,
            'section'        => $this->section,
            'suffix'         => $this->suffix,
            'gender'         => $this->gender,
            'civil_status'   => $this->civilStatus,
            'religion'       => $this->religion,
            'date_of_birth'  => $this->dateOfBirth,
            'place_of_birth' => $this->placeOfBirth,
            'height_ft'      => $this->heightFt,
            'weight_kg'      => $this->weightKg,
        ];
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
        if (is_array($value)) {
            return $value['string'] ?? null;
        }
        // Treat empty string as null — OGOS sends "" for absent middle names
        return ($value !== null && $value !== '') ? $value : null;
    }
}