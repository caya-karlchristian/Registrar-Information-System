<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Local mirror of OGOS course/program data.
 *
 * Populated automatically by OgosStudentService::upsertLocalRecords()
 * on every student SSO login — no manual seeding required.
 *
 * @property int         $ogos_course_id  OGOS course.id (primary key)
 * @property string|null $code            Short code, e.g. "BSIT"
 * @property string      $name            Full name, e.g. "BS Information Technology"
 * @property bool        $is_active       False = hidden from dropdowns (history preserved)
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class Program extends Model
{
    protected $table      = 'programs';
    protected $primaryKey = 'ogos_course_id';

    // ogos_course_id is not auto-incremented — we receive it from OGOS.
    public $incrementing = false;
    protected $keyType   = 'integer';

    protected $fillable = [
        'ogos_course_id',
        'code',
        'name',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ── Scopes ────────────────────────────────────────────────

    /** Returns only programs visible in dropdowns. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
