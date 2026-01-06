<?php

namespace App\Http\Controllers;

use App\Models\SystemUser;
use Illuminate\Http\Request;

class SystemUserController extends Controller
{
    public function index()
    {
        return response()->json(SystemUser::all(), 200);
    }

    public function show($id)
    {
        $user = SystemUser::find($id);
        if (!$user) return response()->json(['message' => 'User not found'], 404);
        return response()->json($user, 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'role_id' => 'required|integer',
        ]);

        $user = SystemUser::create($request->all());
        return response()->json($user, 201);
    }

    public function update(Request $request, $id)
    {
        $user = SystemUser::find($id);
        if (!$user) return response()->json(['message' => 'User not found'], 404);

        $user->update($request->all());
        return response()->json($user, 200);
    }

    public function destroy($id)
    {
        $user = SystemUser::find($id);
        if (!$user) return response()->json(['message' => 'User not found'], 404);

        $user->delete();
        return response()->json(['message' => 'User deleted'], 200);
    }
}
