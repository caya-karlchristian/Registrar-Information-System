<?php

namespace App\Http\Requests\Analytics;

use App\Services\AiConversationService;
use Illuminate\Foundation\Http\FormRequest;

class AiQueryRequest extends FormRequest
{
    /** Maximum prior turns accepted from the client. */
    public const MAX_HISTORY_TURNS = 20;

    public function authorize(): bool
    {
        // Route already sits behind the 'role:3' group + 'module:analytics'
        // middleware in routes/api.php — no per-request Policy check needed.
        return true;
    }

    public function rules(): array
    {
        return [
            'question'          => [
                'required', 'string',
                'min:1',
                'max:' . AiConversationService::MAX_INPUT_LENGTH,
            ],
            'history'           => ['sometimes', 'array', 'max:' . self::MAX_HISTORY_TURNS],
            'history.*.role'    => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:8000'],
            'range'             => ['sometimes', 'string', 'in:today,week,month,year,all,custom'],
            'from'              => ['sometimes', 'nullable', 'date_format:Y-m-d'],
            'to'                => ['sometimes', 'nullable', 'date_format:Y-m-d', 'after_or_equal:from'],
        ];
    }
}
