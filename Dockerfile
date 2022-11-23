FROM node:18.10.0-alpine3.16 AS node

WORKDIR /app
COPY public public/
COPY package.json .
COPY webpack.config.js .
COPY yarn.lock .

RUN yarn install

COPY assets assets/

# RUN yarn encore dev
RUN yarn encore production

# FROM bitnami/symfony:5.4
FROM php:7.4-fpm-alpine AS php

RUN apk --no-cache update && apk --no-cache add bash

# RUN docker-php-ext-install pdo_mysql

RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && php composer-setup.php && php -r "unlink('composer-setup.php');" && mv composer.phar /usr/local/bin/composer

RUN wget https://get.symfony.com/cli/installer -O - | bash && mv /root/.symfony5/bin/symfony /usr/local/bin/symfony

WORKDIR /app
COPY bin bin/
COPY config config/
COPY migrations migrations/
COPY public public/
COPY src src/
COPY translations translations/
COPY .env .
COPY composer.json .
COPY composer.lock .
COPY symfony.lock .

RUN composer install

# contents
COPY --chmod=777 data data/
# folder
RUN chmod 777 data

COPY --from=node /app/public/build public/build/

COPY templates templates/

CMD symfony serve --port=8003
