<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentType extends Model
{
    protected $table = 'document_type';
    protected $primaryKey = 'document_type_id';
    public $timestamps = false;
    protected $fillable = [
        'document_name', 'document_description', 'document_requirements', 'document_process_period',
        'access_id', 'cashier_document_patterns', 'is_archived', 'archived_on', 'archived_by',
    ];

    protected $casts = [
        'cashier_document_patterns' => 'array',
        'is_archived'                => 'boolean',
        'archived_on'                => 'datetime',
    ];

    public function requestDocuments()
    {
        return $this->hasMany(RequestDocument::class, 'document_type_id');
    }

    public function accessType()
    {
        return $this->belongsTo(AccessType::class, 'access_id');
    }

    // Named archivedByUser() (not archivedBy()) so it serializes to
    // "archived_by_user" — "archived_by" is the raw FK column, same
    // convention as DocumentRequest::archivedByUser().
    public function archivedByUser()
    {
        return $this->belongsTo(SystemUser::class, 'archived_by', 'user_id');
    }

    /**
     * Number of non-archived requests currently using this document type
     * that are still in an active (non-terminal) status — i.e. Processing
     * or Ready to Claim. Completed/Forfeited/Cancelled requests, and
     * already-archived requests, don't block archiving.
     *
     * Backs the "3 active requests are using this — can't archive yet"
     * guard from the Archive Policy — Document & Certificate Management.
     * DocumentRequest carries its own ExcludeArchivedScope global scope,
     * so archived requests are excluded here automatically.
     */
    public function activeRequestsCount(): int
    {
        return $this->requestDocuments()
            ->whereHas('documentRequest', function ($query) {
                $query->whereHas(
                    'status',
                    fn ($status) => $status->whereIn('status_name', ['Processing', 'Ready to Claim'])
                );
            })
            ->count();
    }
}