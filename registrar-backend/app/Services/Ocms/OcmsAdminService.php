<?php

namespace App\Services\Ocms;

use App\DTOs\Ocms\OcmsAdminProfileDTO;
use App\Exceptions\OcmsException;
use App\Models\AdminProfile;
use App\Models\SystemUser;
use Illuminate\Support\Facades\Log;

/**
 * Business logic layer for OCMS admin profile data.
 *
 * provisionAdminProfile() is called on every admin/super_admin SSO login —
 * it upserts admin_profile from the OCMS Central Admin Profile Hub.
 * pushProfileToOcms() sends local changes back after an AdminUserService update.
 *
 * Mirrors the structure of OgosStudentService.
 */
class OcmsAdminService
{
    public function __construct(private readonly OcmsClient $client) {}

    // ── Provisioning ──────────────────────────────────────────

    /**
     * Fetch OCMS data and upsert the local admin_profile row.
     *
     * Returns true if a new row was inserted, false if it already existed.
     * Fails silently on OcmsException — a login must never break because
     * OCMS is down. Falls back to a minimal stub on first login.
     */
    public function provisionAdminProfile(SystemUser $user): bool
    {
        $isNew = !AdminProfile::where('user_id', $user->user_id)->exists();

        if (!$user->idp_user_id) {
            Log::warning('OcmsAdminService: user has no idp_user_id — cannot fetch OCMS profile', [
                'user_id' => $user->user_id,
            ]);

            if ($isNew) {
                $this->insertStub($user);
            }

            return $isNew;
        }

        try {
            $dto = $this->client->getAdminProfile($user->idp_user_id);
        } catch (OcmsException $e) {
            Log::warning('OcmsAdminService: OCMS unavailable during provisioning', [
                'user_id' => $user->user_id,
                'error'   => $e->getMessage(),
            ]);
            $dto = null;
        }

        if ($dto === null) {
            if ($isNew) {
                $this->insertStub($user);
            }
            return $isNew;
        }

        $this->upsertLocalRecord($user, $dto);

        Log::info('OcmsAdminService: admin profile provisioned from OCMS', [
            'user_id' => $user->user_id,
            'is_new'  => $isNew,
        ]);

        return $isNew;
    }

    // ── Push to hub ───────────────────────────────────────────

    /**
     * Push a subset of profile fields back to the OCMS hub.
     *
     * Called after a successful local update in AdminUserService.
     * Only sends fields that OCMS owns in its data dictionary.
     * Does not throw — an OCMS push failure must never rollback a local update.
     *
     * @param SystemUser $user
     * @param array      $changedFields  The validated array from the update request
     */
    public function pushProfileToOcms(SystemUser $user, array $changedFields): void
    {
        if (!$user->idp_user_id || empty($this->client)) {
            return;
        }

        // Map RIS field names → OCMS data dictionary field names
        $payload = array_filter([
            'first_name'  => $changedFields['first_name']  ?? null,
            'middle_name' => $changedFields['middle_name'] ?? null,
            'last_name'   => $changedFields['last_name']   ?? null,
            'suffix_name' => $changedFields['suffix']      ?? null,
            'office'      => $changedFields['office']      ?? null,
            'contact_no'  => $changedFields['contact_no']  ?? null,
        ], fn ($v) => !is_null($v));

        if (empty($payload)) {
            return;
        }

        $this->client->updateAdminProfile($user->idp_user_id, $payload);
    }

    // ── Private helpers ───────────────────────────────────────

    private function upsertLocalRecord(SystemUser $user, OcmsAdminProfileDTO $dto): void
    {
        AdminProfile::updateOrCreate(
            ['user_id' => $user->user_id],
            $dto->toLocalArray()
        );
    }

    private function insertStub(SystemUser $user): void
    {
        Log::warning('OcmsAdminService: inserting stub admin_profile — OCMS unreachable or no idp_user_id', [
            'user_id' => $user->user_id,
        ]);

        AdminProfile::firstOrCreate(
            ['user_id' => $user->user_id],
            [
                'first_name' => 'Unknown',
                'last_name'  => 'Unknown',
            ]
        );
    }
}
