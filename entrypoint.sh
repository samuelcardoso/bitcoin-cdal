#!/bin/sh

# file configuration of supervisord
SUPERVISORD_CONF=/etc/supervisord.conf

# file configuration of mongodb
MONGODB_CONF=/etc/mongod.conf

# file configuration of redis
REDIS_CONF=/etc/redis.conf

# create base directory of mongodb
[ ! -d /data/mongo/configdb ] && mkdir -p /data/mongo/configdb
[ ! -d /data/mongo/db ] && mkdir -p /data/mongo/db

# create base directory of redis
[ ! -d /data/redis ] && mkdir -p /data/redis

# create base config file of mongodb
echo "# mongod.conf" > $MONGODB_CONF
echo "dbpath=/data/mongo/db" >> $MONGODB_CONF
echo "logpath=/data/mongo/mongod.log" >> $MONGODB_CONF
echo "logappend=true" >> $MONGODB_CONF
echo "bind_ip=127.0.0.1" >> $MONGODB_CONF

# create base config file of redis
echo "# redis.conf" > $REDIS_CONF
echo "bind 127.0.0.1" >> $REDIS_CONF
echo "dir /data/redis" >> $REDIS_CONF
echo "save 900 1" >> $REDIS_CONF
echo "save 300 10" >> $REDIS_CONF
echo "save 60 10000" >> $REDIS_CONF

# define owner of data
chown -R mongodb.mongodb /data/mongo
chown -R redis.redis /data/redis

# create directory log for supervisord
[ ! -d /var/log/supervisord ] && mkdir /var/log/supervisord

# create new password for supervisor
SUPERVISOR_PASSWORD=$(< /dev/urandom tr -dc A-Za-z0-9 | head -c32)

# create default configuration for supervisord
cat <<EOF >> $SUPERVISORD_CONF
[unix_http_server]
file=/tmp/supervisor.sock
username=supervisor
password=$SUPERVISOR_PASSWORD

[supervisord]
logfile=/var/log/supervisord/supervisord.log
logfile_maxbytes=50MB
logfile_backups=10
loglevel=error
pidfile=/var/run/supervisord.pid
minfds=1024
minprocs=200
user=root
childlogdir=/var/log/supervisord/

[rpcinterface:supervisor]
supervisor.rpcinterface_factory = supervisor.rpcinterface:make_main_rpcinterface

[supervisorctl]
serverurl=unix:///tmp/supervisor.sock
username=supervisor
password=$SUPERVISOR_PASSWORD

[eventlistener:dependentstartup]
command=/usr/bin/supervisord-dependent-startup
autostart=true
events=PROCESS_STATE

[program:mongo]
command=/usr/bin/mongod --config /etc/mongod.conf
user=mongodb
directory=/data/mongo
autostart=false
autorestart=true
startsecs=10
dependent_startup=true

[program:redis]
command=/usr/bin/redis-server /etc/redis.conf
user=redis
directory=/data/redis
autostart=false
autorestart=true
startsecs=10
stderr_logfile=/var/log/redis/errors.log
stdout_logfile=/var/log/redis/redis.log
dependent_startup=true

[program:node]
command=/usr/local/bin/node /app/src/server.js
directory=/app
autostart=false
autorestart=true
startretries=20
stderr_logfile=/app/log/errors.log
stdout_logfile=/app/log/output.log
dependent_startup=true
dependent_startup_wait_for=mongo:running redis:running
EOF

# start supervisord
if [ -z "$1" ]; then
  /usr/bin/supervisord --nodaemon --configuration $SUPERVISORD_CONF
fi

exec "$@"
