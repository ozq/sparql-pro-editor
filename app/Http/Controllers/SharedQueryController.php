<?php

namespace App\Http\Controllers;

use App\SharedQuery;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

/**
 * Class SharedQueryController
 * @package App\Http\Controllers
 */
class SharedQueryController extends Controller
{
    const GROUP_ITEMS_COUNT = 20;

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function store(Request $request)
    {
        $sharedQuery = new SharedQuery($request->all());
        $sharedQuery->save();

        return response()->json(['id' => $sharedQuery->id]);
    }

    /**
     * @return Collection
     */
    public function index()
    {
        return SharedQuery::orderBy('updated_at', 'DESC')->take(self::GROUP_ITEMS_COUNT)->get();
    }

    /**
     * @param $id
     * @return mixed
     */
    public function delete($id)
    {
        $query = SharedQuery::find($id);
        $query->delete();
        return response('', 200);
    }

    /**
     * @param $id
     * @return mixed
     */
    public function get($id)
    {
        if ($query = SharedQuery::where('id', $id)->take(1)->get()->first()) {
            $query->touch();
        }

        return $query;
    }

    public function update(Request $request, $id)
    {
        $query = SharedQuery::find($id);
        $query->update($request->request->all());
        return response('', 200);
    }
}
