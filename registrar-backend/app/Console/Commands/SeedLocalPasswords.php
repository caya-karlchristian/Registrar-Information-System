<?php

namespace App\Console\Commands;

use App\Models\SystemUser;
use App\Services\LocalAuthService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * SeedLocalPasswords
 * ==================
 * One-shot Artisan helper to enable local auth for all admin/superadmin
 * accounts that already have a bcrypt hash in `password` but don't yet
 * have local_auth_enabled = 1.
 *
 * Usage (inside the backend container):
 *
 *   php artisan auth:seed-local-passwords
 *
 * This sets local_auth_enabled = 1 for every admin/superadmin whose
 * `password` column is not empty.  It does NOT change any passwords —
 * the existing hashes remain exactly as-is.
 *
 * For students/alumni you must explicitly set passwords via
 * POST /api/auth/local-password (superadmin endpoint) or pass
 * --all to include every role.
 *
 * Flags
 * -----
 *   --all        Enable local auth for every role (students, alumni too).
 *   --dry-run    Preview which accounts would be updated without writing.
 */
class SeedLocalPasswords extends Command
{
    protected $signature   = 'auth:seed-local-passwords {--all} {--dry-run}';
    protected $description = 'Enable local_auth_enabled for accounts that already have a bcrypt password.';

    public function __construct(private LocalAuthService $localAuth)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $query = SystemUser::whereNotNull('password')
            ->where('password', '!=', '')
            ->where('local_auth_enabled', 0);

        if (!$this->option('all')) {
            $query->whereIn('role_id', [
                SystemUser::ROLE_ADMIN,
                SystemUser::ROLE_SUPER_ADMIN,
            ]);
        }

        $users = $query->get();

        if ($users->isEmpty()) {
            $this->info('No accounts to update — all eligible accounts already have local_auth_enabled = 1.');
            return self::SUCCESS;
        }

        $this->table(
            ['user_id', 'email', 'role_id'],
            $users->map(fn ($u) => [$u->user_id, $u->email, $u->role_id])->toArray()
        );

        if ($this->option('dry-run')) {
            $this->warn('Dry-run mode — no changes written.');
            return self::SUCCESS;
        }

        if (!$this->confirm("Enable local auth for {$users->count()} account(s)?", true)) {
            $this->info('Aborted.');
            return self::SUCCESS;
        }

        $updated = 0;
        foreach ($users as $user) {
            // Only flip the flag — do NOT rehash the existing password.
            // The existing hash (set by AdminUserService or provisioning)
            // is already valid and we must not overwrite it with a new one.
            $user->update(['local_auth_enabled' => 1]);
            $this->line("  ✔  {$user->email}");
            $updated++;
        }

        $this->info("Done — {$updated} account(s) updated.");
        return self::SUCCESS;
    }
}
