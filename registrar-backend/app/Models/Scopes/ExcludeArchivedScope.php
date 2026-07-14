<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Excludes archived records from every query by default — the same way
 * Laravel's own SoftDeletingScope excludes soft-deleted rows.
 *
 * Applying this as a global scope (rather than remembering to add
 * ->where('is_archived', false) at every call site) is what makes the
 * "Archived records shall not participate in active request processing,
 * dashboard analytics, or routine staff operations until restored" rule
 * from the Archive Rules policy hold automatically — ShredExpiredRequests,
 * AnalyticsService, and every existing DocumentRequest::query() call get
 * this behavior for free, with zero risk of a forgotten filter letting an
 * archived record leak into a report or automated job.
 *
 * Call sites that DO need archived rows (the Archived Records tab, the
 * archive/restore actions themselves) opt back in explicitly via the
 * withArchived() / onlyArchived() macros registered below — mirroring the
 * withTrashed() / onlyTrashed() API shape from SoftDeletes so it reads
 * naturally next to it.
 */
class ExcludeArchivedScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where($model->getTable() . '.is_archived', false);
    }

    public function extend(Builder $builder): void
    {
        // Macro closures are rebound so $this refers to the Builder when
        // called, not this scope instance — capture $scope up front
        // (same technique Laravel's own SoftDeletingScope uses).
        $scope = $this;

        $builder->macro('withArchived', function (Builder $builder) use ($scope) {
            return $builder->withoutGlobalScope($scope);
        });

        $builder->macro('onlyArchived', function (Builder $builder) use ($scope) {
            return $builder->withoutGlobalScope($scope)
                ->where($builder->getModel()->getTable() . '.is_archived', true);
        });
    }
}
