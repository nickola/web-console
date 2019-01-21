ARG PHP_VERSION=7.3.1

FROM debian:stretch-20181226 as builder
ARG WEBCONSOLE_VERSION=0.9.7

RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y \
   unzip=6.0-21 \
   wget=1.18-5+deb9u2

RUN wget https://github.com/nickola/web-console/releases/download/v0.9.7/webconsole-0.9.7.zip
RUN unzip webconsole-${WEBCONSOLE_VERSION}.zip
RUN sed 's/^$USER.*/$USER = getenv("USER");;/' /webconsole/webconsole.php \
  | sed 's/^$PASSWORD.*/$PASSWORD = getenv("PASSWORD");/' \
  > index.php

FROM php:${PHP_VERSION}-apache-stretch
COPY --from=builder /index.php /var/www/html