<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It is a breeze. Simply tell Lumen the URIs it should respond to
| and give it the Closure to call when that URI is requested.
|
*/

$app->get('/', function () use ($app) {
    return redirect('index.html');
});

$app->get('/isBackendInstalled', function () use ($app) {
    return response('yes', 200);
});

$app->get('/api/v1/sharedQuery/{id}', 'SharedQueryController@get');
$app->get('/api/v1/sharedQuery', 'SharedQueryController@index');
$app->post('/api/v1/sharedQuery', 'SharedQueryController@store');
$app->put('/api/v1/sharedQuery/{id}', 'SharedQueryController@update');
$app->delete('/api/v1/sharedQuery/{id}', 'SharedQueryController@delete');

$app->post('/sparql', 'SparqlController@execute');