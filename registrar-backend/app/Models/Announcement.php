<?php

namespace App\Models;

use App\Models\Scopes\ExcludeArchivedScope;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = [
        'title',
        'content',
        'enabled',
        'end_date',
        'created_by',
        'is_archived',
        'archived_on',
        'archived_by',
    ];

    protected $casts = [
        'enabled'     => 'boolean',
        'is_archived' => 'boolean',
        'end_date'    => 'date',
        'archived_on' => 'datetime',
    ];

    /**
     * Excludes archived announcements from every query by default, the same
     * way DocumentRequest excludes archived requests — see
     * ExcludeArchivedScope's docblock. Call sites that need archived rows
     * (the Archived tab, archive/restore themselves) opt back in via
     * withArchived() / onlyArchived().
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new ExcludeArchivedScope());
    }

    public function creator()
    {
        return $this->belongsTo(SystemUser::class, 'created_by', 'user_id');
    }

    // Named archivedByUser() (not archivedBy()) so it serializes to
    // "archived_by_user" — "archived_by" is the raw FK column, same
    // convention used by DocumentRequest/DocumentType/CertificationType.
    public function archivedByUser()
    {
        return $this->belongsTo(SystemUser::class, 'archived_by', 'user_id');
    }
}