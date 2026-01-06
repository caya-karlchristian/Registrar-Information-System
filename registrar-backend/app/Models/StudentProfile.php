class StudentProfile extends Model
{
    protected $table = 'student_profile';
    protected $primaryKey = 'student_profile_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id','first_name','middle_name','last_name',
        'date_of_birth','permanent_address','contact_number'
    ];

    public function academicRecord() {
        return $this->hasOne(StudentAcademicRecord::class, 'student_profile_id');
    }
}
