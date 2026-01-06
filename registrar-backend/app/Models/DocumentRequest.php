class DocumentRequest extends Model
{
    protected $table = 'document_request';
    protected $primaryKey = 'request_id';
    public $timestamps = false;

    protected $fillable = [
        'user_id','student_profile_id','academic_record_id',
        'status_id','purpose_of_request','receipt_number',
        'receipt_date','number_of_copies','additional_notes',
        'certification_detail','honors_dismissal_status','cert_type_id'
    ];

    public function status() {
        return $this->belongsTo(RequestStatus::class, 'status_id');
    }

    public function documents() {
        return $this->belongsToMany(
            DocumentType::class,
            'request_document',
            'request_id',
            'document_type_id'
        );
    }
}
