<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class SharedQuery extends Model
{
    protected $fillable = [
        'name', 'endpoint', 'default_graph_uri', 'query',
    ];
}
