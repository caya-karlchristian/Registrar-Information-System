<?php

namespace App\Http\Controllers;

use App\Exceptions\AlumniSystemException;
use App\Services\Alumni\AlumniSystemClient;
use Illuminate\Http\Request;

class AlumniSystemController extends Controller
{
    public function __construct(private AlumniSystemClient $client) {}

    public function index(Request $request)
    {
        try {
            $filters = $request->only(['search', 'batch', 'course_id', 'page']);
            $result  = $this->client->listAlumni($filters);

            return response()->json([
                'success' => true,
                'data'    => array_map(fn($dto) => $dto->toArray(), $result['data']),
                'meta'    => [
                    'total'        => $result['total'],
                    'current_page' => $result['current_page'],
                    'last_page'    => $result['last_page'],
                    'per_page'     => $result['per_page'],
                ],
            ]);
        } catch (AlumniSystemException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }

    public function show(string $id)
    {
        try {
            $alumni = $this->client->getAlumni($id);

            return response()->json([
                'success' => true,
                'data'    => $alumni->toArray(),
            ]);
        } catch (AlumniSystemException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getCode() ?: 500);
        }
    }
}