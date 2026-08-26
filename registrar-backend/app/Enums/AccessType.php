<?php

namespace App\Enums;

/**
 * Canonical, single source of truth for `access_id` semantics across the
 * backend. Mirrors DatabaseSeeder::seedAccessType() / the `access_type`
 * table exactly (1=Student, 2=Alumni, 3=Both) — those seeded rows are the
 * real source of truth in the database; this enum is the type-safe way to
 * reference the same three values in code without retyping raw integers.
 *
 * Why this exists
 * ----------------
 * Before this enum, "which access_id values are self-service-visible, and
 * to whom" was hand-copied as a raw int array independently in at least
 * five places across the backend and frontend (see the sibling frontend
 * module registrar-frontend/src/constants/accessTypes.js for the full
 * list). Nothing enforced that those copies agreed with each other. One of
 * them silently drifting from the rest — CashierDocumentSuggester using
 * the *student* form's [1,3] list instead of the union [1,2,3] — meant
 * every alumni-exclusive (access_id=2) document/certificate type could
 * never be suggested or matched during OR verification, no matter how
 * many times an admin "resolved" it. Backing every self-service access
 * check with this enum's helper methods instead of a hand-typed array is
 * what prevents that class of bug from recurring: change the mapping once,
 * here, and every consumer picks it up.
 *
 * Any new backend code that needs to reason about which types a student or
 * alumni can see should use this enum's helpers rather than writing a new
 * `[1, 3]` / `[2, 3]` / `[1, 2, 3]` literal.
 */
enum AccessType: int
{
    case Student = 1;
    case Alumni  = 2;
    case Both    = 3;

    /**
     * access_id values visible on the STUDENT self-service form.
     * Mirrors registrar-frontend/src/constants/accessTypes.js's
     * STUDENT_ACCESS_IDS — keep in sync if that ever changes.
     *
     * @return int[]
     */
    public static function studentVisibleIds(): array
    {
        return [self::Student->value, self::Both->value];
    }

    /**
     * access_id values visible on the ALUMNI self-service form.
     * Mirrors registrar-frontend/src/constants/accessTypes.js's
     * ALUMNI_ACCESS_IDS — keep in sync if that ever changes.
     *
     * @return int[]
     */
    public static function alumniVisibleIds(): array
    {
        return [self::Alumni->value, self::Both->value];
    }

    /**
     * access_id values visible on EITHER self-service form — the union of
     * studentVisibleIds() and alumniVisibleIds(). Use this for any backend
     * process (like cashier OR-verification matching) that must serve
     * both audiences and therefore needs to see every type either of them
     * can select, not just one form's subset.
     *
     * @return int[]
     */
    public static function selfServiceVisibleIds(): array
    {
        return [self::Student->value, self::Alumni->value, self::Both->value];
    }
}