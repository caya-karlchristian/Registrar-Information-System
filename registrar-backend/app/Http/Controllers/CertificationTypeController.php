<?php

namespace App\Http\Controllers;

use App\Models\CertificationType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CertificationTypeController extends Controller
{
    private function selectCertificateColumns(): array
    {
        return [
            'certificate_type_id',
            'certificate_name',
            'certificate_requirements',
            'certificate_process_period',
            'access_id',
            'layout_header_left_url',
            'layout_header_right_url',
            'layout_footer_urls',
            'layout_header_logo_size',
            'layout_footer_logo_size',
        ];
    }

    public function layouts()
    {
        $layouts = CertificationType::query()
            ->select($this->selectCertificateColumns())
            ->orderBy('certificate_name')
            ->get();

        return response()->json($layouts, 200);
    }

    public function index()
    {
        return response()->json(
            CertificationType::query()->select($this->selectCertificateColumns())->get(),
            200
        );
    }

    public function show($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        return response()->json(
            CertificationType::query()
                ->select($this->selectCertificateColumns())
                ->where('certificate_type_id', $id)
                ->first(),
            200
        );
    }

    public function store(Request $request)
    {
        $request->validate([
            'certificate_name' => 'required|string|max:255',
        ]);

        $cert = CertificationType::create([
            'certificate_name' => $request->input('certificate_name'),
            'certificate_requirements' => $request->input('certificate_requirements'),
            'certificate_process_period' => $request->input('certificate_process_period'),
            'access_id' => $request->input('access_id'),
        ]);

        return response()->json(
            CertificationType::query()
                ->select($this->selectCertificateColumns())
                ->where('certificate_type_id', $cert->certificate_type_id)
                ->first(),
            201
        );
    }

    public function update(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        $cert->update($request->all());

        return response()->json(
            CertificationType::query()
                ->select($this->selectCertificateColumns())
                ->where('certificate_type_id', $id)
                ->first(),
            200
        );
    }

    public function destroy($id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        $cert->delete();
        return response()->json(['message' => 'Certification type deleted'], 200);
    }

    public function updateLayout(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        $payload = $request->validate([
            'layout_header_left_url' => 'nullable|string|max:2048',
            'layout_header_right_url' => 'nullable|string|max:2048',
            'layout_footer_urls' => 'nullable|array',
            'layout_footer_urls.*' => 'string|max:2048',
            'layout_header_logo_size' => 'nullable|integer|min:24|max:240',
            'layout_footer_logo_size' => 'nullable|integer|min:16|max:240',
        ]);

        if (array_key_exists('layout_footer_urls', $payload) && $payload['layout_footer_urls'] === null) {
            $payload['layout_footer_urls'] = [];
        }

        $cert->update($payload);

        return response()->json([
            'message' => 'Certification layout updated successfully',
            'data' => $cert->fresh(),
        ], 200);
    }

    public function uploadLayoutLogo(Request $request, $id)
    {
        $cert = CertificationType::find($id);
        if (!$cert) return response()->json(['message' => 'Certification type not found'], 404);

        $validated = $request->validate([
            'logo' => 'required|image|max:4096',
            'slot' => 'nullable|in:header_left,header_right,footer',
        ]);

        $slot = $validated['slot'] ?? 'footer';
        $disk = 'public';
        $path = $request->file('logo')->store("certification-layouts/{$id}/{$slot}", $disk);
        $url = Storage::url($path);

        return response()->json([
            'message' => 'Logo uploaded successfully',
            'data' => [
                'slot' => $slot,
                'path' => $path,
                'url' => $url,
            ],
        ], 201);
    }
}
