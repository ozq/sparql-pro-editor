FROM php:7-fpm

RUN apt-get update && apt-get install -y libmcrypt-dev \
    mysql-client --no-install-recommends \
    && docker-php-ext-install mcrypt pdo_mysql

COPY app.start.sh /app.start.sh
RUN chmod 755 /app.start.sh
CMD ["/bin/bash", "/app.start.sh"]