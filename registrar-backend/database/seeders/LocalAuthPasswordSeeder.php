<?php

namespace Database\Seeders;

use App\Models\SystemUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

/**
 * LocalAuthPasswordSeeder
 * =======================
 * Sets bcrypt passwords and enables local_auth_enabled = 1 for the
 * accounts listed below so they can log in when the IDP is unreachable.
 *
 * Safe to re-run — uses updateOrSkip logic so already-set passwords
 * are only overwritten if the plaintext in this file has changed.
 *
 * Usage (inside the backend container):
 *   php artisan db:seed --class=LocalAuthPasswordSeeder
 *
 * To roll back (disable local auth for all these accounts):
 *   php artisan db:seed --class=LocalAuthPasswordSeeder --action=rollback
 *   — or manually: UPDATE users SET local_auth_enabled = 0 WHERE email IN (...)
 *
 * ⚠ SECURITY: Delete or vault this file after seeding in production.
 *   Plaintext passwords should not live in version control long-term.
 */
class LocalAuthPasswordSeeder extends Seeder
{
    /**
     * Individual account passwords.
     * Format: 'email' => 'plaintext_password'
     */
    private const ACCOUNTS = [
        'alumni@gmail.com'                    => 'NO$Vzw4Yk6GH',
        'aronadmin@gmail.com'                 => 'wqz%A64mR39u',
        'aronstephenscordova@gmail.com'       => 'sS%U&yV&vz3L',
        'chryzalynecaya@gmail.com'            => 'KCbo#01GnX^s',
        'jhoseph@gmail.com'                   => 'NOkzUxMc@^fE',
        'josephadmin@gmail.com'               => 'wqgKM#fs27yD',
        'joshuabillones@gmail.com'            => '4Vzezwtj0^zz',
        'juan@gmail.com'                      => 'Jo*B!7TRyQ3B',
        'karlcaya0704@gmail.com'              => 'Tech4ward2027',
        'maria@gmail.com'                     => '!&jn&EuM6hdi',
        'marosetolentino@gmail.com'           => 'y7MqZ6kd4bS#',
        'mhel@gmail.com'                      => '6P#hSpVBMge&',
        'mhelgarcia@gmail.com'                => 'SE^e!41xz6Od',
        'pedro@gmail.com'                     => 'vZeItS#&7qO#',
        'rissuperadmin@gmail.com'             => 'VL@SSIx$sb7a',
        'rose@gmail.com'                      => '1p%33DEU0ogK',
        'student5@gmail.com'                  => 'Password123*',
        'student15@gmail.com'                 => 'Password123*',
        'student17@gmail.com'                 => 'Password123*',
        'student20@gmail.com'                 => 'Password123*',
        'student25@gmail.com'                 => 'Password123*',
        'student30@gmail.com'                 => 'Password123*',
        'student31@gmail.com'                 => 'Password123*',
        'student33@gmail.com'                 => 'Password123*',
        'student35@gmail.com'                 => 'Password123*',
        'student37@gmail.com'                 => 'Password123*',
        'student109@gmail.com'                => 'H830PzN@MOEH',   // exception
        'teamtech4ward.ris2027@gmail.com'     => 'Tech4ward@2027',
        'testadmin@gmail.com'                 => 'qA9@toWY20Ho',
        'testsuperadmin2@gmail.com'           => 'Tech4ward2027',
    ];

    /**
     * Bulk accounts — same password applied to every email matching the pattern.
     * Processed BEFORE individual ACCOUNTS so individual entries can override.
     *
     * Format: [ 'pattern' => fn(string $email): bool, 'password' => '...' ]
     */
    private const BULK_RULES = [
        [
            // all student#@gmail.com  (student1, student2, … student999)
            // Excludes student109 — overridden individually in ACCOUNTS above.
            'match'    => '/^student\d+@gmail\.com$/',
            'password' => 'Password123*',
        ],
    ];

    // -------------------------------------------------------------------------

    public function run(): void
    {
        $results = ['set' => 0, 'skipped' => 0, 'not_found' => []];

        // ── 1. Collect all emails we need to touch ────────────────────────────
        // Start with bulk rules, then overlay individual overrides.
        $targets = [];   // email => plaintext

        foreach (self::BULK_RULES as $rule) {
            $users = SystemUser::where('email', 'regexp', ltrim(rtrim($rule['match'], '/'), '/'))
                ->get();

            // Fallback: if the DB doesn't support REGEXP, load all and filter in PHP.
            if ($users->isEmpty()) {
                $users = SystemUser::all()->filter(
                    fn ($u) => preg_match($rule['match'], $u->email)
                );
            }

            foreach ($users as $u) {
                $targets[$u->email] = $rule['password'];
            }
        }

        // Individual entries override bulk rules (e.g. student109 exception).
        foreach (self::ACCOUNTS as $email => $password) {
            $targets[$email] = $password;
        }

        // ── 2. Apply ──────────────────────────────────────────────────────────
        foreach ($targets as $email => $plaintext) {
            /** @var SystemUser|null $user */
            $user = SystemUser::where('email', $email)->first();

            if (!$user) {
                $results['not_found'][] = $email;
                $this->command->warn("  NOT FOUND: {$email}");
                continue;
            }

            $user->update([
                'password'           => Hash::make($plaintext),
                'local_auth_enabled' => 1,
            ]);

            $results['set']++;
            $this->command->line("  ✔  {$email}");

            Log::info('LocalAuthPasswordSeeder: password set', [
                'user_id' => $user->user_id,
                'email'   => $email,
            ]);
        }

        // ── 3. Summary ────────────────────────────────────────────────────────
        $this->command->newLine();
        $this->command->info("Done — {$results['set']} password(s) set.");

        if (!empty($results['not_found'])) {
            $this->command->warn(count($results['not_found']) . " email(s) not found in users table:");
            foreach ($results['not_found'] as $e) {
                $this->command->warn("  • {$e}");
            }
        }
    }
}
