<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StudentProfile;
use App\Models\StudentAcademicRecord;
use App\Models\DocumentRequest;
use App\Models\RequestHistory;
use Illuminate\Support\Facades\DB;

class StudentRequestController extends Controller
{
    public function store(Request $request)
    {
        DB::transaction(function () use ($request) {

            $profile = StudentProfile::create([
                'user_id' => $request->user_id,
                'first_name' => $request->first_name,
                'middle_name' => $request->middle_name,
                'last_name' => $request->last_name,
                'date_of_birth' => $request->date_of_birth,
                'permanent_address' => $request->address,
                'contact_number' => $request->contact_number
            ]);

            $record = StudentAcademicRecord::create([
                'student_profile_id' => $profile->student_profile_id,
                'student_number' => $request->student_number,
                'course' => $request->course,
                'year_level' => $request->year_level,
                'school_year_admitted' => $request->admission_year,
                'last_school_year_attended' => $request->last_sy_attended
            ]);

            $req = DocumentRequest::create([
                'user_id' => $request->user_id,
                'student_profile_id' => $profile->student_profile_id,
                'academic_record_id' => $record->academic_record_id,
                'status_id' => 1, // Pending
                'purpose_of_request' => $request->purpose,
                'receipt_number' => $request->receipt_number,
                'receipt_date' => $request->receipt_date,
                'number_of_copies' => $request->number_of_copies,
                'additional_notes' => $request->notes,
                'certification_detail' => $request->certification_detail,
                'cert_type_id' => $request->cert_type_id
            ]);

            foreach ($request->document_type_ids as $docId) {
                DB::table('request_document')->insert([
                    'request_id' => $req->request_id,
                    'document_type_id' => $docId
                ]);
            }

            RequestHistory::create([
                'request_id' => $req->request_id,
                'old_status_id' => 1,
                'new_status_id' => 1,
                'changed_by' => $request->user_id
            ]);
        });

        return response()->json(['message' => 'Request submitted']);
    }
}
