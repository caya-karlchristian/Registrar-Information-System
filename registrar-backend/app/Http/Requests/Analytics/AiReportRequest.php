<?php

namespace App\Http\Requests\Analytics;

use Illuminate\Foundation\Http\FormRequest;

class AiReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route already sits behind the 'role:3' group + 'module:analytics'
        // middleware in routes/api.php — no per-request Policy check needed.
        return true;
    }

    public function rules(): array
    {
        return [
            // phase3-audit: max_length guard (minor finding #2)
            'range' => ['sometimes', 'string', 'in:today,week,month,year,all,custom'],
            'from'  => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to'    => ['sometimes', 'nullable', 'date_format:Y-m-d'],
        ];
    }
}
