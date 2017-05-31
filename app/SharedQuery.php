<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class SharedQuery extends Model
{
    protected $fillable = [
        'name', 'endpoint', 'default_graph_uri', 'query',
    ];

    public function setNameAttribute($value)
    {
        $this->attributes['name'] = strip_tags($value);
    }
}
