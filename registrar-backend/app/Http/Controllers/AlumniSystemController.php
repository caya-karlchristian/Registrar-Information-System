<?php

namespace App\Http\Controllers;

use App\Services\Alumni\AlumniSystemClient;
use Illuminate\Http\Request;
use App\Contracts\AlumniSystemClientInterface;

class AlumniSystemController extends Controller
{
    public function __construct(private AlumniSystemClientInterface $client) {}

    public function index(Request $request)
    {
        $filters = $request->only(['search', 'batch', 'course_id', 'page']);
        $result  = $this->client->tryListAlumni($filters);

        return response()->json([
            'success' => true,
            'data'    => array_map(fn($dto) => $dto->toArray(), $result['data']),
            'meta'    => [
                'total'        => $result['total'],
                'current_page' => $result['current_page'],
                'last_page'    => $result['last_page'],
                'per_page'     => $result['per_page'],
            ],
            'source_available' => count($result['data']) > 0 || $result['total'] === 0,
        ]);
    }

    public function show(string $id)
    {
        $alumni = $this->client->tryGetAlumni($id);

        if ($alumni === null) {
            return response()->json([
                'success'          => false,
                'message'          => 'Alumni not found or Alumni System is currently unavailable.',
                'source_available' => false,
            ], 404);
        }

        return response()->json([
            'success'          => true,
            'data'             => $alumni->toArray(),
            'source_available' => true,
        ]);
    }
}