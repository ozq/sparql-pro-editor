<?php

namespace App\Http\Controllers;

use GuzzleHttp\Client;
use Illuminate\Http\Request;

/**
 * Class SparqlController
 * @package App\Http\Controllers
 */
class SparqlController extends Controller
{
    /**
     * @var Client
     */
    protected $client;

    /**
     * SparqlController constructor.
     */
    public function __construct()
    {
        $this->client = new Client();
    }

    /**
     * @param Request $request
     * @return \Psr\Http\Message\StreamInterface
     */
    public function execute(Request $request)
    {
        $uri = $request->input('endpoint');
        $options['form_params'] = $request->input('data');

        if (preg_match('/\\w+:\\w+@/', $uri, $credentials)) {
            $uri = preg_replace('/\\w+:\\w+@/', '', $uri);
            $credentials = explode(':', trim($credentials[0], '@'));
            $authMethod = $request->input('auth_method') ?: 'basic';
            $options['auth'] = [$credentials[0], $credentials[1], $authMethod];
        }

        $response = $this->client->post($uri, $options);

        return $response->getBody();
    }
}
