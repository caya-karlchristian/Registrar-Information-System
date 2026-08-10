<?php

namespace App\Http\Requests\Policy;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route sits behind the superadmin-only (role:4) group in
        // routes/api.php — no per-request Policy check needed here.
        return true;
    }

    public function rules(): array
    {
        // {id} is the route param (Policy::find($id) happens in the
        // controller, not via route-model binding), so it's read directly
        // here for the unique-ignore clause. Same value the controller
        // uses to look the policy up by primary key.
        $policyId = $this->route('id');

        return [
            'name'          => "sometimes|string|max:100|unique:policies,name,{$policyId},policy_id",
            'permissions'   => 'sometimes|array',
            'permissions.*' => 'array',
        ];
    }
}
