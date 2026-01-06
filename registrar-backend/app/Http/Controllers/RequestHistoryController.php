<?php

namespace App\Http\Controllers;

use App\Models\RequestHistory;
use Illuminate\Http\Request;

class RequestHistoryController extends Controller
{
    public function index()
    {
        return response()->json(RequestHistory::with(['request'])->get(), 200);
    }

    public function show($id)
    {
        $history = RequestHistory::with(['request'])->find($id);
        if (!$history) return response()->json(['message' => 'History not found'], 404);

        return response()->json($history, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'request_id' => 'required|integer',
            'old_status_id' => 'required|integer',
            'new_status_id' => 'required|integer',
            'changed_by' => 'required|integer',
        ]);

        $history = RequestHistory::create($request->all());
        return response()->json($history, 201);
    }

    public function update(Request $request, $id)
    {
        $history = RequestHistory::find($id);
        if (!$history) return response()->json(['message' => 'History not found'], 404);

        $history->update($request->all());
        return response()->json($history, 200);
    }

    public function destroy($id)
    {
        $history = RequestHistory::find($id);
        if (!$history) return response()->json(['message' => 'History not found'], 404);

        $history->delete();
        return response()->json(['message' => 'History deleted'], 200);
    }
}
