class RequestHistory extends Model
{
    protected $table = 'request_history';
    protected $primaryKey = 'history_id';
    public $timestamps = false;

    protected $fillable = [
        'request_id','old_status_id','new_status_id','changed_by'
    ];
}
