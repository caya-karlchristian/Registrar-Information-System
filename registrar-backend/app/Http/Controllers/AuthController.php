<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\SystemUser;
use App\Http\Resources\UserResource;
use App\Services\AuditLogger;
use App\Models\AuditLog;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required',
            'password' => 'required'
        ]);

        $user = SystemUser::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if ($user->status === 'Deactivated') {
            return response()->json([
                'message' => 'Your account has been deactivated. Please contact the registrar.'
            ], 403);
        }

        $token = $user->createToken('ris_token')->plainTextToken;

        AuditLogger::log($request, $user, AuditLog::ACTION_LOGIN);

        return response()->json([
            'token' => $token
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        $user->loadIdentityRelations();

        return new UserResource($user);
    }

    public function logout(Request $request)
    {
        AuditLogger::log($request, $request->user(), AuditLog::ACTION_LOGOUT);
        $request->user()->tokens()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}
