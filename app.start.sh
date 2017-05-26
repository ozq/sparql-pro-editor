#!/bin/sh
if [ ! -f .env ]; then
    cp .env.example .env
fi

php artisan cache:clear
chmod -R 777 ./storage

php-fpm