<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateSharedQueriesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('shared_queries', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name');
            $table->string('endpoint')->nullable();
            $table->string('default_graph_uri')->nullable();
            $table->longText('query');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('shared_queries');
    }
}
