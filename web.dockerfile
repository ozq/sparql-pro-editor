FROM nginx:1.10

RUN rm /etc/nginx/conf.d/default.conf

ADD vhost.conf /etc/nginx/conf.d/vhost.conf