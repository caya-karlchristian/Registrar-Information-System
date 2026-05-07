<?php

namespace App\DTOs\Ogos;

/**
 * Maps the OGOS /personal-info endpoint response.
 *
 * Confirmed real response structure:
 * {
 *   studentNumber: string,
 *   gender:        { id: int, name: string },
 *   dateOfBirth:   string (ISO 8601 — "2004-09-29T00:00:00Z"),
 *   placeOfBirth:  string,
 *   heightFt:      float,
 *   weightKg:      float,
 * }
 *
 * NOTE: civilStatus, religion, suffix, section, course are NOT returned
 * by this endpoint — only the fields above are real.
 */
readonly class OgosPersonalInfoDTO
{
    public function __construct(
        public string  $studentNumber,
        public ?string $gender,       // gender.name
        public ?string $dateOfBirth,  // ISO 8601 — strip time component before storing
        public ?string $placeOfBirth,
        public ?float  $heightFt,
        public ?float  $weightKg,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            studentNumber: $data['studentNumber'] ?? '',
            gender:        $data['gender']['name'] ?? null,
            // Strip the time component: "2004-09-29T00:00:00Z" → "2004-09-29"
            dateOfBirth:   isset($data['dateOfBirth'])
                               ? substr($data['dateOfBirth'], 0, 10)
                               : null,
            placeOfBirth:  $data['placeOfBirth'] ?? null,
            heightFt:      isset($data['heightFt']) ? (float) $data['heightFt'] : null,
            weightKg:      isset($data['weightKg']) ? (float) $data['weightKg'] : null,
        );
    }

    public function toArray(): array
    {
        return [
            'student_number' => $this->studentNumber,
            'gender'         => $this->gender,
            'date_of_birth'  => $this->dateOfBirth,
            'place_of_birth' => $this->placeOfBirth,
            'height_ft'      => $this->heightFt,
            'weight_kg'      => $this->weightKg,
        ];
    }
}