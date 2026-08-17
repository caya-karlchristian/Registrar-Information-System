<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
use App\Models\SystemUser;
use App\Models\AuditLog;
use App\Contracts\DocumentRequestServiceInterface;
use App\Http\Requests\DocumentRequest\BulkRequestIdsRequest;
use App\Http\Requests\DocumentRequest\ClaimDocumentRequestRequest;
use App\Http\Requests\DocumentRequest\StoreDocumentRequestRequest;
use App\Http\Requests\DocumentRequest\UpdateDocumentRequestRequest;
use App\Http\Requests\DocumentRequest\VerifyOfficialReceiptRequest;
use App\Services\DocumentRequestService;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Services\CashierService;
use App\Services\CashierDocumentMatcher;
use App\Services\CashierDocumentSuggester;
use App\Services\NameMatcher;
use Illuminate\Support\Facades\Auth;

/**
 * Document request HTTP controller.
 *
 * Responsibilities: validate input, authorize, delegate to DocumentRequestService, return JSON.
 * Business logic lives entirely in DocumentRequestService.
 *
 * Validation for store()/update()/archiveBulk()/restoreBulk() now lives in
 * App\Http\Requests\DocumentRequest\* — see each class's rules(). Their
 * authorize() methods also replace the explicit $this->authorize() calls
 * store()/update() used to make (archive()/restore()/view()/delete() below
 * still call $this->authorize() directly since those don't take a
 * FormRequest — there's nothing to validate on those routes).
 */
class DocumentRequestController extends Controller
{
    private const RELATIONS = [
        'user',
        'studentProfile',
        'academicRecord',
        'alumniProfile',
        'alumniAcademicRecord',
        'status',
        'requestPurpose',
        'documents.documentType',
        'certificates.certificationType',
        'archivedByUser',
    ];

    public function __construct(
        private DocumentRequestServiceInterface $requestService,
        private CashierService                  $cashierService,
        private CashierDocumentMatcher          $documentMatcher,
        private CashierDocumentSuggester        $documentSuggester,
        private AuditLogger                     $auditLogger,
        private NameMatcher                     $nameMatcher,
    ) {}

    // -------------------------------------------------------------------------
    // GET /document-requests
    // -------------------------------------------------------------------------
    public function index()
    {
        /** @var SystemUser $user */
        $user  = Auth::user();
        $query = DocumentRequest::with(self::RELATIONS);

        if (!$user instanceof SystemUser) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (!$user->isStaff()) {
            // Students / alumni: return ALL of their own requests so the
            // frontend dashboard never silently loses older records.
            // Their volume is low enough that a full ->get() is safe.
            return response()->json([
                'data' => $query
                    ->where('user_id', $user->user_id)
                    ->orderByDesc('requested_at')
                    ->get(),
            ], 200);
        }

        // Staff: potentially thousands of rows — keep pagination.
        $perPage = min((int) request()->query('per_page', 20), 200); // cap at 200

        // Archived Records tab: bypass the default global scope entirely and
        // return ONLY archived requests, regardless of status/age. Archived
        // records are not part of "actionable work" so the all_statuses
        // window below doesn't apply to them.
        if (request()->query('view') === 'archived') {
            return response()->json(
                $query->withArchived()
                    ->where('document_request.is_archived', true)
                    ->orderByDesc('archived_on')
                    ->paginate($perPage),
                200
            );
        }

        // By default the dashboard only shows actionable work: Processing, ReadyToClaim,
        // and Completed requests that are less than 1 day old.  Forfeited, Cancelled, and
        // older Completed records are omitted unless the caller passes ?all_statuses=1
        // (used when the frontend has an explicit status filter or search active).
        $allStatuses = filter_var(request()->query('all_statuses', false), FILTER_VALIDATE_BOOLEAN);

        if (!$allStatuses) {
            $cutoff = now()->subDay();

            $query->where(function ($q) use ($cutoff) {
                // Processing (1) and ReadyToClaim (2) — always visible
                $q->whereHas('status', fn ($s) => $s->whereIn('status_name', ['Processing', 'Ready to Claim']))
                  // Completed (3) within the last 24 hours
                  ->orWhere(function ($q2) use ($cutoff) {
                      $q2->whereHas('status', fn ($s) => $s->where('status_name', 'Completed'))
                         ->where('requested_at', '>=', $cutoff);
                  });
            });
        }

        return response()->json($query->orderByDesc('requested_at')->paginate($perPage), 200);
    }


    // -------------------------------------------------------------------------
    // GET /document-requests/counts
    // -------------------------------------------------------------------------
    // Returns a total count per status across the WHOLE table, not just the
    // current page. The staff dashboard stat cards (New Requests, Processing,
    // Ready for Pickup, etc.) must call this instead of deriving counts from
    // the paginated `index()` response — index() is capped at per_page=200
    // and, by default, already excludes Forfeited/Cancelled/old-Completed rows,
    // so filtering that array client-side silently under-counts once total
    // volume passes 200 requests. This endpoint runs a single grouped COUNT
    // query and is unaffected by pagination or the actionable-work filter.
    // Staff/superadmin only (role:3,4) — same audience as the dashboard.
    public function counts()
    {
        $counts = DocumentRequest::join('request_status', 'document_request.status_id', '=', 'request_status.status_id')
            ->selectRaw('request_status.status_name, COUNT(*) as total')
            ->groupBy('request_status.status_name')
            ->pluck('total', 'status_name');

        // Archived count is reported separately — it's a cross-cutting flag,
        // not a status, so it doesn't belong in the status_name-keyed map above.
        $counts['Archived'] = DocumentRequest::withArchived()
            ->where('document_request.is_archived', true)
            ->count();

        return response()->json($counts, 200);
    }

    // -------------------------------------------------------------------------
    // GET /document-requests/logbook
    // Returns completed requests with embedded history — purpose-built for the
    // Logbook page.  Avoids the N+1 page-loop + separate history fetch the
    // frontend previously performed.
    // Staff/superadmin only (enforced by route middleware role:3,4).
    // -------------------------------------------------------------------------
    // BE-1 migration: added from/to/doc_type filters
    // Accepts optional query params:
    //   ?from=YYYY-MM-DD    filter requests on or after this date
    //   ?to=YYYY-MM-DD      filter requests on or before this date
    //   ?doc_type=string    filter by document_name (partial, case-insensitive)
    //   ?per_page=int       page size, default 25, capped at 100
    //   ?page=int           page number, default 1 (standard Laravel paginator)
    //
    // BE-2: was ->get() with no limit — every completed request, forever,
    // in one response. Switched to paginate(); page size is capped server
    // -side so a client can't force an unbounded query by passing a huge
    // per_page. requested_at already has an index (dr_requested_at_idx
    // from the base schema migration) so ordering + the from/to filters
    // stay index-backed.
    public function logbook(Request $request)
    {
        $query = DocumentRequest::with(array_merge(self::RELATIONS, ['history']))
            ->whereHas('status', fn ($q) => $q->where('status_name', 'Completed'));

        if ($from = $request->query('from')) {
            $query->whereDate('requested_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('requested_at', '<=', $to);
        }

        if ($docType = $request->query('doc_type')) {
            $query->whereHas('documents.documentType', function ($q) use ($docType) {
                $q->where('document_name', 'like', '%' . $docType . '%');
            });
        }

        $perPage = (int) $request->query('per_page', 25);
        $perPage = max(1, min($perPage, 100));

        return response()->json(
            $query->orderByDesc('requested_at')->paginate($perPage),
            200
        );
    }

    // -------------------------------------------------------------------------
    // GET /document-requests/{documentRequest}
    // -------------------------------------------------------------------------
    // Manual lookup (not implicit route-model binding) because
    // ExcludeArchivedScope would otherwise 404 an archived record —
    // Archive Rules requires archived records to remain viewable
    // (read-only) from the Archived Records tab.
    public function show($id)
    {
        $documentRequest = DocumentRequest::withArchived()->findOrFail($id);
        $this->authorize('view', $documentRequest);
        return response()->json($documentRequest->load(self::RELATIONS), 200);
    }

    // -------------------------------------------------------------------------
    // POST /document-requests
    // -------------------------------------------------------------------------
    public function store(StoreDocumentRequestRequest $request)
    {
        $validated = $request->validated();

        if (empty($validated['documents']) && empty($validated['certificates'])) {
            return response()->json([
                'message' => 'At least one document or certificate must be requested.',
            ], 422);
        }

        // or-validation: single-use check
        if (!empty($validated['or_number'])) {
            if ($this->cashierService->isOrAlreadyUsed($validated['or_number'])) {
                $message = 'This OR number has already been used for a previous request. Each Official Receipt can only be used once.';
                return response()->json([
                    'message' => $message,
                    'errors'  => ['or_number' => [$message]],
                ], 422);
            }
        }

        // or-validation: verify OR before creating request
        //
        // This is the money-facing gate and stays exactly as strict as it
        // always was: verifyReceiptAgainstCashier() below is a straight
        // extraction of what used to live inline here (same retry loop,
        // same audit log call, same error messages) — nothing about it
        // got weaker when verifyOfficialReceipt() below started reusing
        // it. CashierDocumentMatcher (the strict cross-check against
        // whatever the student actually confirmed) still runs here and
        // ONLY here, unchanged.
        if (!empty($validated['or_number'])) {
            /** @var \App\Models\SystemUser $user */
            $user = Auth::user();

            $verification = $this->verifyReceiptAgainstCashier($request, $user, $validated['or_number']);

            if ($verification['error'] !== null) {
                return $verification['error'];
            }

            // document-validation: cross-check paid items against requested items.
            // Only runs when the cashier API returns items[] (live mode).
            // Mock mode / no-profile skips all checks gracefully — every
            // item passes when there is nothing to match against.
            if (!$verification['is_mock']) {
                $matchResult = $this->documentMatcher->match(
                    cashierItems: $verification['cashier_items'],
                    documents:    $validated['documents']    ?? [],
                    certificates: $validated['certificates'] ?? [],
                );

                if (!$matchResult['valid']) {
                    return response()->json([
                        'message' => $matchResult['message'],
                        'errors'  => $matchResult['errors'],
                    ], 422);
                }
            }
        }

        $documentRequest = $this->requestService->createRequest(Auth::user(), $validated);

        return response()->json($documentRequest->load(self::RELATIONS), 201);
    }

    // -------------------------------------------------------------------------
    // POST /document-requests/verify-or
    //
    // New first step of the request wizard (OR-first reorder): verifies the
    // OR number/payment date against the cashier API and returns document
    // suggestions derived from the receipt — WITHOUT creating a
    // DocumentRequest. The frontend uses this to pre-populate the Documents
    // step; everything it returns stays editable, and store() above still
    // re-verifies and re-matches from scratch at final submit. See
    // CashierDocumentSuggester's class docblock for why this is a distinct,
    // deliberately softer check than the strict matcher.
    // -------------------------------------------------------------------------
    public function verifyOfficialReceipt(VerifyOfficialReceiptRequest $request): JsonResponse
    {
        $validated = $request->validated();

        // Same single-use guard as store() — no point suggesting documents
        // against an OR that final submit will reject outright. This does
        // NOT mark the OR as used; only a successful store() does that
        // (by way of the created DocumentRequest row itself).
        if ($this->cashierService->isOrAlreadyUsed($validated['or_number'])) {
            $message = 'This OR number has already been used for a previous request. Each Official Receipt can only be used once.';
            return response()->json([
                'message' => $message,
                'errors'  => ['or_number' => [$message]],
            ], 422);
        }

        /** @var \App\Models\SystemUser $user */
        $user = Auth::user();

        $verification = $this->verifyReceiptAgainstCashier($request, $user, $validated['or_number']);

        if ($verification['error'] !== null) {
            return $verification['error'];
        }

        $suggestions = $this->documentSuggester->suggest($verification['cashier_items']);

        return response()->json([
            'valid'        => true,
            'or_number'    => $validated['or_number'],
            'receipt_date' => $validated['receipt_date'],
            'is_mock'      => $verification['is_mock'],
            'suggestions'  => $suggestions,
        ], 200);
    }

    // -------------------------------------------------------------------------
    // Shared OR-verification helper — used by store() (final, strict
    // submission) and verifyOfficialReceipt() (pre-submission suggestion
    // step) so the name-candidate retry loop and audit trail can never
    // drift between the two call sites. Extracted unchanged from what used
    // to be store()'s own inline logic.
    //
    // Does NOT run CashierDocumentMatcher or CashierDocumentSuggester —
    // those stay specific to each caller. This method only answers "is
    // this OR number, for this user, valid?" and hands back the raw
    // cashier line items for the caller to do what it needs with.
    //
    // @return array{
    //     error: JsonResponse|null,
    //     cashier_items: array,
    //     is_mock: bool,
    // }
    // -------------------------------------------------------------------------
    private function verifyReceiptAgainstCashier(Request $request, \App\Models\SystemUser $user, string $orNumber): array
    {
        // Resolve the customer name from the user's profile. Students and
        // alumni have separate profile tables; admins submitting on behalf
        // of a student are not expected to hit this path (walk-in requests
        // bypass OR validation entirely) — and verifyOfficialReceipt() is
        // only ever reachable by role:1,2 (student/alumni) per the route,
        // so this branch is a defensive fallback there, not the common case.
        $profile = $user->studentProfile ?? $user->alumniProfile ?? null;

        if (!$profile) {
            return ['error' => null, 'cashier_items' => [], 'is_mock' => true];
        }

        // The Cashier API does exact string matching against a free-text
        // "Customer Name" field the Cashier System itself doesn't validate
        // (confirmed via screenshot of its payment form). On failure it
        // never tells us what name is actually on file — NOT_FOUND means
        // either "wrong OR" or "wrong name", indistinguishably — so
        // there's nothing to compare against after the fact. Instead: try
        // a small set of plausible name formattings for this same person,
        // stopping at the first one the API accepts. Every attempt is
        // logged so the eventual decision is traceable.
        $candidates = $this->nameMatcher->candidatesFor(
            $profile->last_name   ?? '',
            $profile->first_name  ?? '',
            $profile->middle_name ?? '',
            $profile->suffix      ?? '',
        );

        $verification = null;
        $matchedName  = null;
        $attemptsLog  = [];

        foreach ($candidates as $candidate) {
            $attempt = $this->cashierService->verifyPayment($orNumber, $candidate);

            $attemptsLog[] = [
                'name'   => $candidate,
                'valid'  => $attempt['valid'],
                'reason' => $attempt['reason'] ?? null,
            ];

            $verification = $attempt;
            $matchedName  = $candidate;

            if ($attempt['valid']) {
                break; // found a formatting the cashier accepts — stop here
            }

            // Only worth trying alternate formattings when the failure is
            // a real lookup miss. An API_ERROR (server error / connection
            // failure) won't be fixed by a different name string, and
            // retrying it 2-3x in a row would just add latency to an
            // already-failing request for no benefit.
            if (($attempt['reason'] ?? null) === 'API_ERROR') {
                break;
            }
        }

        $isMockAttempt = $verification['data']['_mock'] ?? false;

        $this->auditLogger->log($request, $user, \App\Models\AuditLog::ACTION_CASHIER_VERIFICATION, [
            'or_number'      => $orNumber,
            'attempts'       => $attemptsLog,
            'matched_name'   => $verification['valid'] ? $matchedName : null,
            'is_mock'        => $isMockAttempt,
            'final_approved' => $verification['valid'],
        ]);

        if (!$verification['valid']) {
            $reason = $verification['reason'] ?? 'NOT_FOUND';

            $message = match ($reason) {
                'NOT_FOUND' => 'The OR number could not be found. Please check your Official Receipt and try again.',
                'API_ERROR' => 'Payment verification is temporarily unavailable. Please try again later.',
                default     => 'Payment verification failed. Please contact the registrar\'s office.',
            };

            return [
                'error' => response()->json([
                    'message' => $message,
                    'errors'  => ['or_number' => [$message]],
                ], 422),
                'cashier_items' => [],
                'is_mock'       => $isMockAttempt,
            ];
        }

        return [
            'error'         => null,
            'cashier_items' => $verification['data']['items'] ?? [],
            'is_mock'       => $isMockAttempt,
        ];
    }

    // -------------------------------------------------------------------------
    // PUT /document-requests/{documentRequest}
    // -------------------------------------------------------------------------
    public function update(UpdateDocumentRequestRequest $request, DocumentRequest $documentRequest)
    {
        $validated = $request->validated();

        $documentRequest = $this->requestService->updateRequest($documentRequest, $validated);

        return response()->json($documentRequest->load(self::RELATIONS), 200);
    }

    // -------------------------------------------------------------------------
    // POST /document-requests/claim
    //
    // QR Code Claiming Policy v1.0. No {documentRequest} route param —
    // staff arrive with a scanned uuid or a typed claim_code, not a known
    // request_id, so lookup happens inside the service. Authorization is
    // handled by ClaimDocumentRequestRequest::authorize() (staff-only),
    // same as every other write action in this controller.
    // -------------------------------------------------------------------------
    public function claim(ClaimDocumentRequestRequest $request)
    {
        $documentRequest = $this->requestService->claimRequest($request->validated());

        return response()->json($documentRequest->load(self::RELATIONS), 200);
    }

    // -------------------------------------------------------------------------
    // DELETE /document-requests/{documentRequest}
    // -------------------------------------------------------------------------
    public function destroy(DocumentRequest $documentRequest)
    {
        $this->authorize('delete', $documentRequest);

        try {
            // forceDelete(), not delete(): the model uses SoftDeletes, so a
            // plain delete() would only stamp deleted_at and leave the row
            // in place — this endpoint is a permanent delete, distinct from
            // the separate is_archived/archive() mechanism above.
            $documentRequest->forceDelete();
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a request that still has associated documents, history, or notifications.',
                ], 409);
            }

            throw $e;
        }

        return response()->json(['message' => 'Request deleted successfully'], 200);
    }

    // -------------------------------------------------------------------------
    // Archive / Restore
    //
    // Reversible and independent of status_id — see Archive Eligibility
    // Policy – Administrator. Uses manual lookups (DocumentRequest::withArchived())
    // rather than implicit route-model binding since ExcludeArchivedScope
    // would otherwise 404 the restore endpoint before it ever runs.
    // -------------------------------------------------------------------------

    // PATCH /document-requests/{id}/archive
    public function archive($id)
    {
        $documentRequest = DocumentRequest::withArchived()->findOrFail($id);
        $this->authorize('archive', $documentRequest);

        /** @var SystemUser $actor */
        $actor = Auth::user();
        $documentRequest = $this->requestService->archiveRequest($documentRequest, $actor);

        $this->auditLogger->log(request(), $actor, AuditLog::ACTION_REQUEST_ARCHIVED, [
            'request_id' => $documentRequest->request_id,
        ]);

        return response()->json(
            DocumentRequest::withArchived()->with(self::RELATIONS)->find($documentRequest->request_id),
            200
        );
    }

    // PATCH /document-requests/{id}/restore
    public function restore($id)
    {
        $documentRequest = DocumentRequest::withArchived()->findOrFail($id);
        $this->authorize('restore', $documentRequest);

        /** @var SystemUser $actor */
        $actor = Auth::user();
        $documentRequest = $this->requestService->restoreRequest($documentRequest, $actor);

        $this->auditLogger->log(request(), $actor, AuditLog::ACTION_REQUEST_RESTORED, [
            'request_id' => $documentRequest->request_id,
        ]);

        return response()->json(
            DocumentRequest::withArchived()->with(self::RELATIONS)->find($documentRequest->request_id),
            200
        );
    }

    // POST /document-requests/archive-bulk  { request_ids: [...] }
    public function archiveBulk(BulkRequestIdsRequest $request)
    {
        /** @var SystemUser $actor */
        $actor = Auth::user();
        $validated = $request->validated();

        $result = $this->requestService->archiveRequests($validated['request_ids'], $actor);

        foreach ($result['archived'] as $requestId) {
            $this->auditLogger->log($request, $actor, AuditLog::ACTION_REQUEST_ARCHIVED, [
                'request_id' => $requestId,
                'bulk'       => true,
            ]);
        }

        return response()->json($result, 200);
    }

    // POST /document-requests/restore-bulk  { request_ids: [...] }
    public function restoreBulk(BulkRequestIdsRequest $request)
    {
        /** @var SystemUser $actor */
        $actor = Auth::user();
        $validated = $request->validated();

        $result = $this->requestService->restoreRequests($validated['request_ids'], $actor);

        foreach ($result['restored'] as $requestId) {
            $this->auditLogger->log($request, $actor, AuditLog::ACTION_REQUEST_RESTORED, [
                'request_id' => $requestId,
                'bulk'       => true,
            ]);
        }

        return response()->json($result, 200);
    }
}