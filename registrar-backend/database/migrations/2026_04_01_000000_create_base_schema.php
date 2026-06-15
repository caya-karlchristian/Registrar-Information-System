<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF;');
        }
        // 1. roles (no deps)
        Schema::create('roles', function (Blueprint $table) {
            $table->integer('role_id')->autoIncrement();
            $table->string('role_name', 50)->unique();
        });

        // 2. users (depends on: roles)
        Schema::create('users', function (Blueprint $table) {
            $table->integer('user_id')->autoIncrement();
            $table->integer('role_id');
            $table->enum('status', ['Activated', 'Deactivated'])->default('Activated');
            $table->string('email', 100)->unique();
            $table->string('idp_user_id', 255)->nullable();
            $table->text('idp_access_token')->nullable();
            $table->string('password', 255);
            $table->tinyInteger('local_auth_enabled')->default(0)->comment('1 = local bcrypt password has been set and may be used as IDP fallback');
            $table->timestamp('created_at')->nullable()->useCurrent();

            $table->foreign('role_id', 'fk_users_role')
                ->references('role_id')->on('roles')
                ->onDelete('restrict')->onUpdate('cascade');
        });

        // 3. access_type (no deps)
        Schema::create('access_type', function (Blueprint $table) {
            $table->integer('access_id')->autoIncrement();
            $table->string('access_name', 50);
        });

        // 4. alumni_type (no deps)
        Schema::create('alumni_type', function (Blueprint $table) {
            $table->integer('alumni_type_id')->autoIncrement();
            $table->string('alumni_type', 50)->unique();
        });

        // 5. courses (no deps)
        Schema::create('courses', function (Blueprint $table) {
            $table->integer('course_id')->autoIncrement();
            $table->string('code', 50)->unique();
            $table->string('course_name', 200)->unique();
        });

        // 6. request_status (no deps)
        Schema::create('request_status', function (Blueprint $table) {
            $table->integer('status_id')->autoIncrement();
            $table->string('status_name', 50);
        });

        // 7. request_purpose (no deps)
        Schema::create('request_purpose', function (Blueprint $table) {
            $table->integer('request_purpose_id')->autoIncrement();
            $table->string('purpose_name', 100)->unique();
        });

        // 8. notification_types (no deps)
        Schema::create('notification_types', function (Blueprint $table) {
            $table->integer('notification_type_id')->autoIncrement();
            $table->string('trigger_event', 100)->unique();
            $table->string('title', 255);
            $table->text('message_template');
            $table->enum('audience', ['student_alumni', 'admin', 'both', 'all'])->default('student_alumni');
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
        });

        // 9. document_type (depends on: access_type)
        Schema::create('document_type', function (Blueprint $table) {
            $table->integer('document_type_id')->autoIncrement();
            $table->string('document_name', 255);
            $table->text('document_requirements')->nullable();  
            $table->string('document_process_period', 100);
            $table->integer('access_id')->nullable();
            $table->json('cashier_document_patterns')->nullable();

            $table->foreign('access_id')->references('access_id')->on('access_type');
        });

        // 10. certificate_type (depends on: access_type)
        Schema::create('certificate_type', function (Blueprint $table) {
            $table->integer('certificate_type_id')->autoIncrement();
            $table->string('certificate_name', 255);
            $table->text('certificate_requirements');
            $table->string('certificate_process_period', 100);
            $table->integer('access_id');
            $table->json('cashier_document_patterns')->nullable();
            $table->string('layout_header_left_url', 2048)->nullable();
            $table->string('layout_header_right_url', 2048)->nullable();
            $table->json('layout_footer_urls')->nullable();
            $table->smallInteger('layout_header_logo_size')->unsigned()->nullable();
            $table->smallInteger('layout_footer_logo_size')->unsigned()->nullable();

            $table->foreign('access_id')->references('access_id')->on('access_type');
        });

        // 11. admin_profile (depends on: users)
        Schema::create('admin_profile', function (Blueprint $table) {
            $table->integer('admin_profile_id')->autoIncrement();
            $table->integer('user_id')->unique();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('suffix', 20)->nullable();
            $table->string('office', 150)->nullable();
            $table->string('contact_no', 30)->nullable();
            $table->string('emergency_contact_person', 150)->nullable();
            $table->date('birthday')->nullable();
            $table->string('gender', 30)->nullable();
            $table->string('civil_status', 30)->nullable();
            $table->text('address')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('place_of_birth', 150)->nullable();
            $table->enum('sex_at_birth', ['Male', 'Female'])->nullable();

            $table->foreign('user_id', 'admin_profile_ibfk_1')
                ->references('user_id')->on('users')
                ->onDelete('cascade');
        });

        // 12. alumni (depends on: users, alumni_type)
        Schema::create('alumni', function (Blueprint $table) {
            $table->integer('alumni_id')->autoIncrement();
            $table->integer('user_id')->unique();
            $table->integer('alumni_type_id');

            $table->foreign('user_id', 'alumni_ibfk_1')
                ->references('user_id')->on('users')
                ->onDelete('cascade');
            $table->foreign('alumni_type_id', 'alumni_ibfk_2')
                ->references('alumni_type_id')->on('alumni_type')
                ->onDelete('restrict');
        });

        // 13. alumni_profile (depends on: alumni)
        Schema::create('alumni_profile', function (Blueprint $table) {
            $table->integer('alumni_profile_id')->autoIncrement();
            $table->integer('alumni_id');
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('suffix', 20)->nullable();
            $table->date('date_of_birth');
            $table->string('place_of_birth', 150)->nullable();
            $table->enum('sex_at_birth', ['Male', 'Female']);

            $table->foreign('alumni_id', 'alumni_profile_ibfk_1')
                ->references('alumni_id')->on('alumni')
                ->onDelete('cascade');
        });

        // 14. alumni_academic_record (depends on: alumni_profile)
        Schema::create('alumni_academic_record', function (Blueprint $table) {
            $table->integer('alumni_academic_id')->autoIncrement();
            $table->integer('alumni_profile_id');
            $table->string('student_number', 50)->nullable();
            $table->string('maiden_name', 150)->nullable();
            $table->year('year_of_graduation');
            $table->string('course', 100);

            $table->foreign('alumni_profile_id', 'alumni_academic_record_ibfk_1')
                ->references('alumni_profile_id')->on('alumni_profile')
                ->onDelete('cascade');
        });

        // 15. student_profile (depends on: users)
        Schema::create('student_profile', function (Blueprint $table) {
            $table->integer('student_profile_id')->autoIncrement();
            $table->integer('user_id')->unique('uq_student_profile_user_id');
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('suffix', 20)->nullable();
            $table->date('date_of_birth');
            $table->string('place_of_birth', 150)->nullable();
            $table->enum('sex_at_birth', ['Male', 'Female'])->default('Male');

            $table->foreign('user_id', 'student_profile_ibfk_1')
                ->references('user_id')->on('users');
        });

        // 16. student_academic_record (depends on: student_profile, courses)
        Schema::create('student_academic_record', function (Blueprint $table) {
            $table->integer('student_academic_id')->autoIncrement();
            $table->integer('student_profile_id');
            $table->string('student_number', 50)->unique('uq_student_number');
            $table->integer('course_id')->nullable();
            $table->string('course', 255)->nullable();
            $table->integer('year_level')->nullable();
            $table->string('section', 50)->nullable();
            $table->string('school_year_admitted', 20)->nullable();
            $table->string('last_school_year_attended', 20)->nullable();

            $table->foreign('student_profile_id', 'student_academic_record_ibfk_1')
                ->references('student_profile_id')->on('student_profile');
            $table->foreign('course_id', 'fk_sar_course')
                ->references('course_id')->on('courses');
        });

        // 17. student_contact_information (depends on: student_profile)
        Schema::create('student_contact_information', function (Blueprint $table) {
            $table->integer('student_contact_id')->autoIncrement();
            $table->integer('student_profile_id');
            $table->string('mobile_number', 20)->nullable();
            $table->string('personal_email_address', 100)->nullable();
            $table->string('house_unit_number', 50)->nullable();
            $table->string('street', 150)->nullable();
            $table->string('barangay', 150)->nullable();
            $table->string('municipality', 150)->nullable();
            $table->string('province', 150)->nullable();
            $table->string('country', 150)->nullable();

            $table->foreign('student_profile_id', 'student_contact_information_ibfk_1')
                ->references('student_profile_id')->on('student_profile')
                ->onDelete('cascade');
        });

        // 18. document_request (depends on: users, student_profile, student_academic_record,
        //                        request_status, request_purpose, alumni_profile, alumni_academic_record)
        Schema::create('document_request', function (Blueprint $table) {
            $table->integer('request_id')->autoIncrement();
            $table->char('uuid', 36)->unique('document_request_uuid_unique');
            $table->integer('user_id');
            $table->integer('student_profile_id')->nullable();
            $table->integer('student_academic_id')->nullable();
            $table->integer('alumni_profile_id')->nullable();
            $table->integer('alumni_academic_id')->nullable();
            $table->integer('status_id');
            $table->integer('request_purpose_id');
            $table->string('or_number', 50)->nullable();
            $table->date('receipt_date')->nullable();
            $table->timestamp('requested_at')->nullable()->useCurrent();
            $table->softDeletes();

            $table->index('user_id');
            $table->index('student_profile_id');
            $table->index('student_academic_id', 'academic_record_id');
            $table->index('status_id');
            $table->index('request_purpose_id', 'fk_dr_purpose');
            $table->index('alumni_profile_id', 'fk_dr_alumni_profile');
            $table->index('alumni_academic_id', 'fk_dr_alumni_academic');
            $table->index('deleted_at', 'idx_dr_deleted_at');
            $table->index('requested_at', 'dr_requested_at_idx');
            $table->index('status_id', 'dr_status_id_idx');
            $table->index('user_id', 'dr_user_id_idx');

            $table->foreign('user_id', 'document_request_ibfk_1')
                ->references('user_id')->on('users');
            $table->foreign('student_profile_id', 'document_request_ibfk_2')
                ->references('student_profile_id')->on('student_profile');
            $table->foreign('student_academic_id', 'document_request_ibfk_3')
                ->references('student_academic_id')->on('student_academic_record');
            $table->foreign('status_id', 'document_request_ibfk_4')
                ->references('status_id')->on('request_status');
            $table->foreign('alumni_academic_id', 'fk_dr_alumni_academic')
                ->references('alumni_academic_id')->on('alumni_academic_record');
            $table->foreign('alumni_profile_id', 'fk_dr_alumni_profile')
                ->references('alumni_profile_id')->on('alumni_profile');
            $table->foreign('request_purpose_id', 'fk_dr_purpose')
                ->references('request_purpose_id')->on('request_purpose');
        });

        // 19. request_document (depends on: document_request, document_type)
        Schema::create('request_document', function (Blueprint $table) {
            $table->integer('request_document_id')->autoIncrement();
            $table->integer('request_id');
            $table->integer('document_type_id');
            $table->unsignedTinyInteger('number_of_copies')->default(1);

            $table->index('request_id');
            $table->index('document_type_id');
            $table->index(['request_id', 'document_type_id'], 'rd_request_doctype_idx');

            $table->foreign('request_id', 'request_document_ibfk_1')
                ->references('request_id')->on('document_request');
        });

        // 20. request_certificate (depends on: document_request, certificate_type)
        Schema::create('request_certificate', function (Blueprint $table) {
            $table->integer('request_certificate_id')->autoIncrement();
            $table->integer('request_id');
            $table->integer('certificate_type_id');
            $table->unsignedTinyInteger('number_of_copies')->default(1);

            $table->index('request_id');
            $table->index('certificate_type_id');

            $table->foreign('request_id', 'request_certificate_ibfk_1')
                ->references('request_id')->on('document_request')
                ->onDelete('cascade');
        });

        // 21. request_history (depends on: document_request, request_status, users)
        Schema::create('request_history', function (Blueprint $table) {
            $table->integer('request_history_id')->autoIncrement();
            $table->integer('request_id');
            $table->integer('old_status_id');
            $table->integer('new_status_id');
            $table->dateTime('changed_at')->useCurrent();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->integer('processed_by')->nullable();
            $table->string('processed_by_email', 100)->nullable();
            $table->integer('minutes_processed')->nullable();

            $table->index('request_id');
            $table->index('old_status_id', 'fk_old_status');
            $table->index('new_status_id', 'fk_new_status');
            $table->index('processed_by', 'fk_request_history_processed_by');

            $table->foreign('request_id', 'request_history_ibfk_1')
                ->references('request_id')->on('document_request');
            $table->foreign('new_status_id', 'fk_new_status')
                ->references('status_id')->on('request_status');
            $table->foreign('old_status_id', 'fk_old_status')
                ->references('status_id')->on('request_status');
            $table->foreign('processed_by', 'fk_request_history_processed_by')
                ->references('user_id')->on('users')
                ->onDelete('set null');
        });

        // 22. notifications (depends on: notification_types, document_request)
        Schema::create('notifications', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->integer('notification_type_id');
            $table->string('notifiable_type', 255);
            $table->unsignedBigInteger('notifiable_id');
            $table->json('data')->nullable();
            $table->integer('request_id')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
            $table->softDeletes();

            $table->index(['notifiable_type', 'notifiable_id'], 'idx_notifiable');
            $table->index('read_at', 'idx_read_at');
            $table->index('deleted_at', 'idx_deleted_at');
            $table->index('request_id', 'idx_request_id');
            $table->index('created_at', 'idx_created_at');

            $table->foreign('notification_type_id', 'fk_notif_type')
                ->references('notification_type_id')->on('notification_types')
                ->onDelete('restrict');
            $table->foreign('request_id', 'fk_notif_request')
                ->references('request_id')->on('document_request')
                ->onDelete('set null');
        });

        // 23. announcements (no FK deps; created_by is a loose reference)
        Schema::create('announcements', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->autoIncrement();
            $table->string('title', 255);
            $table->text('content');
            $table->boolean('enabled')->default(true);
            $table->unsignedBigInteger('created_by');
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        // 24. audit_logs (depends on: users via nullable FK)
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->autoIncrement();
            $table->integer('user_id')->nullable();
            $table->string('email', 100);
            $table->string('role_name', 50);
            $table->string('action', 100);
            $table->string('browser', 255)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('user_id', 'fk_audit_logs_user');

            $table->foreign('user_id', 'fk_audit_logs_user')
                ->references('user_id')->on('users')
                ->onDelete('set null');
        });

        // 25. programs (no deps)
        Schema::create('programs', function (Blueprint $table) {
            $table->unsignedInteger('ogos_course_id')->primary();
            $table->string('code', 20)->nullable();
            $table->string('name', 255);
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        // 26. personal_access_tokens (no FK deps)
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->autoIncrement();
            $table->string('tokenable_type', 255);
            $table->unsignedBigInteger('tokenable_id');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->index(['tokenable_type', 'tokenable_id'],
                'personal_access_tokens_tokenable_type_tokenable_id_index');
            $table->index('expires_at', 'personal_access_tokens_expires_at_index');
        });

        // 27. sessions (no FK deps)
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id', 255)->primary();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity');

            $table->index('user_id', 'sessions_user_id_index');
        });

        // 28. cache (no FK deps)
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key', 255)->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        // 29. cache_locks (no FK deps)
        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key', 255)->primary();
            $table->string('owner', 255);
            $table->integer('expiration');
        });

        // 30. jobs (no FK deps)
        Schema::create('jobs', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->autoIncrement();
            $table->string('queue', 255);
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');

            $table->index('queue', 'jobs_queue_index');
        });

        // 31. job_batches (no FK deps)
        Schema::create('job_batches', function (Blueprint $table) {
            $table->string('id', 255)->primary();
            $table->string('name', 255);
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->longText('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('created_at');
            $table->integer('finished_at')->nullable();
        });

        // 32. failed_jobs (no FK deps)
        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->autoIncrement();
            $table->string('uuid', 255)->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });
    }

    public function down(): void
    {
        // Drop in reverse dependency order
        Schema::dropIfExists('failed_jobs');
        Schema::dropIfExists('job_batches');
        Schema::dropIfExists('jobs');
        Schema::dropIfExists('cache_locks');
        Schema::dropIfExists('cache');
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('programs');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('request_history');
        Schema::dropIfExists('request_certificate');
        Schema::dropIfExists('request_document');
        Schema::dropIfExists('document_request');
        Schema::dropIfExists('student_contact_information');
        Schema::dropIfExists('student_academic_record');
        Schema::dropIfExists('student_profile');
        Schema::dropIfExists('alumni_academic_record');
        Schema::dropIfExists('alumni_profile');
        Schema::dropIfExists('alumni');
        Schema::dropIfExists('admin_profile');
        Schema::dropIfExists('certificate_type');
        Schema::dropIfExists('document_type');
        Schema::dropIfExists('notification_types');
        Schema::dropIfExists('request_purpose');
        Schema::dropIfExists('request_status');
        Schema::dropIfExists('courses');
        Schema::dropIfExists('alumni_type');
        Schema::dropIfExists('access_type');
        Schema::dropIfExists('users');
        Schema::dropIfExists('roles');
    }
};
