<?php

namespace App\DTOs\Ogos;

/**
 * Maps a single entry from the OGOS /addresses endpoint.
 *
 * Confirmed real response structure (each item in the data array):
 * {
 *   studentNumber: string,
 *   addressType:   string  ("Residential", "Provincial"),
 *   streetDetail:  string,
 *   barangay:      { code, name },
 *   city:          { code, name },
 *   province:      { code, name, regionCode },
 *   region:        { code, name },
 * }
 */
readonly class OgosAddressDTO
{
    public function __construct(
        public string  $studentNumber,
        public string  $addressType,
        public ?string $streetDetail,
        public ?string $barangayCode,
        public ?string $barangayName,
        public ?string $cityCode,
        public ?string $cityName,
        public ?string $provinceCode,
        public ?string $provinceName,
        public ?string $regionCode,
        public ?string $regionName,
    ) {}

    public static function fromArray(array $item): self
    {
        return new self(
            studentNumber: $item['studentNumber'] ?? '',
            addressType:   $item['addressType']   ?? '',
            streetDetail:  $item['streetDetail']  ?? null,
            barangayCode:  $item['barangay']['code'] ?? null,
            barangayName:  $item['barangay']['name'] ?? null,
            cityCode:      $item['city']['code']     ?? null,
            cityName:      $item['city']['name']     ?? null,
            provinceCode:  $item['province']['code'] ?? null,
            provinceName:  $item['province']['name'] ?? null,
            regionCode:    $item['region']['code']   ?? null,
            regionName:    $item['region']['name']   ?? null,
        );
    }

    /** @return self[] */
    public static function collectionFromArray(array $items): array
    {
        return array_map(fn(array $item) => self::fromArray($item), $items);
    }

    public function toArray(): array
    {
        return [
            'student_number' => $this->studentNumber,
            'address_type'   => $this->addressType,
            'street_detail'  => $this->streetDetail,
            'barangay_code'  => $this->barangayCode,
            'barangay'       => $this->barangayName,
            'city_code'      => $this->cityCode,
            'city'           => $this->cityName,
            'province_code'  => $this->provinceCode,
            'province'       => $this->provinceName,
            'region_code'    => $this->regionCode,
            'region'         => $this->regionName,
        ];
    }

    public function formatted(): string
    {
        return implode(', ', array_filter([
            $this->streetDetail,
            $this->barangayName,
            $this->cityName,
            $this->provinceName,
            $this->regionName,
        ]));
    }
}