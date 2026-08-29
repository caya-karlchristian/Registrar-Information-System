<?php

namespace App\Http\Controllers;

use App\Http\Requests\LogbookCategory\StoreLogbookCategoryRequest;
use App\Http\Requests\LogbookCategory\UpdateLogbookCategoryRequest;
use App\Models\LogbookCategory;
use Illuminate\Http\JsonResponse;

/**
 * CRUD for the logbook_category lookup table — see that migration's
 * docblock (2026_08_29_000000_create_logbook_categories_table) for why
 * this exists: it lets several document_type/certificate_type rows
 * (e.g. every "Certified True Copy of X" variant) collapse into one
 * logbook display line without merging their actual processing identity.
 *
 * Mirrors RequestPurposeController's shape exactly — same small,
 * rarely-changing, admin-editable lookup pattern.
 */
class LogbookCategoryController extends Controller
{
    /**
     * GET /api/logbook-categories
     *
     * Returns all logbook categories, ordered alphabetically. Cached for
     * 1 hour — same reasoning as RequestPurposeController::index(): this
     * is fetched on every Add Document/Add Certificate form load by every
     * authenticated role, and categories rarely change.
     */
    public function index(): JsonResponse
    {
        $categories = cache()->remember('logbook_categories.all', now()->addHour(), function () {
            return LogbookCategory::orderBy('name')->get();
        });

        return response()->json($categories);
    }

    /**
     * GET /api/logbook-categories/{id}
     */
    public function show(int $id): JsonResponse
    {
        $category = LogbookCategory::find($id);

        if (! $category) {
            return response()->json(['message' => 'Logbook category not found.'], 404);
        }

        return response()->json($category);
    }

    /**
     * POST /api/logbook-categories
     * Admin / Superadmin only.
     *
     * Lets an admin create a new umbrella category inline from the Add
     * Document/Add Certificate screen (e.g. adding "Certified True Copy
     * of Records" once, then pointing every CTC variant at it) rather
     * than needing a separate dedicated admin screen just to seed rows
     * into this table.
     */
    public function store(StoreLogbookCategoryRequest $request): JsonResponse
    {
        $category = LogbookCategory::create($request->validated());

        cache()->forget('logbook_categories.all');

        return response()->json($category, 201);
    }

    /**
     * PUT /api/logbook-categories/{id}
     * Admin / Superadmin only.
     */
    public function update(UpdateLogbookCategoryRequest $request, int $id): JsonResponse
    {
        $category = LogbookCategory::find($id);

        if (! $category) {
            return response()->json(['message' => 'Logbook category not found.'], 404);
        }

        $category->update($request->validated());

        cache()->forget('logbook_categories.all');

        return response()->json($category);
    }

    /**
     * DELETE /api/logbook-categories/{id}
     * Admin / Superadmin only.
     *
     * A category cannot be deleted while any document_type/certificate_type
     * row still points at it — the DB foreign key throws an integrity
     * exception, surfaced here as a 409 Conflict, same as
     * RequestPurposeController::destroy().
     */
    public function destroy(int $id): JsonResponse
    {
        $category = LogbookCategory::find($id);

        if (! $category) {
            return response()->json(['message' => 'Logbook category not found.'], 404);
        }

        try {
            $category->delete();
        } catch (\Illuminate\Database\QueryException $e) {
            // MySQL error 1451 — FK constraint violation
            if ($e->getCode() === '23000') {
                return response()->json([
                    'message' => 'Cannot delete a category that is still assigned to a document or certificate type.',
                ], 409);
            }

            throw $e;
        }

        cache()->forget('logbook_categories.all');

        return response()->json(['message' => 'Logbook category deleted.']);
    }
}
