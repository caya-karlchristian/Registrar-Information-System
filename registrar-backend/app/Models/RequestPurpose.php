<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RequestPurpose extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'request_purpose_id';
    protected $fillable = ['purpose_name'];
    protected $table = 'request_purpose';

    public function documentRequests()
    {
        return $this->hasMany(DocumentRequest::class, 'request_purpose_id');
    }
}
