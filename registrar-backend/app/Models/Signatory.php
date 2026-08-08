<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A person who can appear as a signatory (e.g. "Campus Registrar") on
 * issued certificates. Replaces the hardcoded `signeeOptions` array in
 * GenerateCertificate.jsx and the `SIGNATORY_MAP` in utils/helpers.jsx —
 * see the 2026_08_13_000000_create_signatories_table migration.
 */
class Signatory extends Model
{
    protected $table = 'signatories';
    protected $primaryKey = 'signatory_id';

    protected $fillable = [
        'name',
        'position',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
