ARG PHP_VERSION=7.4.9

FROM debian:buster-20201012-slim as builder
ARG WEBCONSOLE_VERSION=0.9.7

RUN apt-get update && apt-get -y upgrade
RUN apt-get install -y unzip=6.0-23+deb10u1 wget=1.20.1-1.1

RUN wget https://github.com/nickola/web-console/releases/download/v${WEBCONSOLE_VERSION}/webconsole-${WEBCONSOLE_VERSION}.zip
RUN unzip webconsole-${WEBCONSOLE_VERSION}.zip
RUN sed 's/^$USER.*/$USER = getenv("USER");;/' /webconsole/webconsole.php \
  | sed 's/^$PASSWORD.*/$PASSWORD = getenv("PASSWORD");/' \
  > index.php

FROM php:${PHP_VERSION}-apache-buster
COPY --from=builder /index.php /var/www/html
