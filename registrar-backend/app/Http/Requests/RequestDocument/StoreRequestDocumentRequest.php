<?php

namespace App\Http\Requests\RequestDocument;

use Illuminate\Foundation\Http\FormRequest;

class StoreRequestDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the 'role:1,2' middleware (student/alumni) in
        // routes/api.php. The ownership check — does the authenticated
        // user actually own the parent document_request — stays in the
        // controller, since it needs a DB lookup against Auth::id() and
        // isn't a shape/type rule.
        return true;
    }

    public function rules(): array
    {
        return [
            'request_id'       => 'required|integer|exists:document_request,request_id',
            'document_type_id' => 'required|integer|exists:document_type,document_type_id',
            'number_of_copies' => 'required|integer|min:1|max:10',
        ];
    }
}
