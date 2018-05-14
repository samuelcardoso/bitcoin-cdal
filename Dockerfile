FROM node:9-alpine

ARG VERSION=master
ENV VERSION=${VERSION}

LABEL maintainer="gleisson.assis@gmail.com"
LABEL source="https://github.com/gleissonassis/bitcoin-cdal.git"
LABEL version="${VERSION}"

ADD entrypoint.sh /

COPY LICENSE package.json /app/
COPY src /app/src

RUN mkdir -p /app/log \
 && echo http://dl-4.alpinelinux.org/alpine/edge/testing >> /etc/apk/repositories \
 && apk add --no-cache mongodb mongodb-tools make gcc g++ git python redis py-pip \
 && pip install supervisor \
 && pip install git+https://github.com/bendikro/supervisord-dependent-startup.git@v1.1.0 \
 && cd /app \
 && npm install --production \
 && chmod +x /entrypoint.sh

WORKDIR /

ENTRYPOINT ["/entrypoint.sh"]
