<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    // Tests that `uses(RefreshDatabase::class)` run `migrate:fresh` against
    // an empty schema — reference/lookup tables (roles, access_type,
    // programs, etc., seeded in DatabaseSeeder) are NOT populated by that
    // alone. Without this, any test inserting a `users` row (or anything
    // else with an FK into those lookup tables) fails with a foreign key
    // constraint violation before the test's own logic ever runs.
    //
    // Setting $seed = true makes RefreshDatabase pass `--seed` to
    // `migrate:fresh`, which runs DatabaseSeeder::run() once per test run
    // (RefreshDatabaseState::$migrated caches this — it's not re-seeded on
    // every single test, only the first migrate:fresh of the run).
    //
    // DatabaseSeeder's LocalDevSeeder call stays guarded behind
    // app()->environment('local'), so this does NOT create the fake local
    // dev accounts/sample data in the testing environment — only the
    // reference tables every feature test actually depends on.
    protected $seed = true;
}