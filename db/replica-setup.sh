#!/bin/bash
set -euo pipefail
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -h mysql-primary -uroot <<'SQL'
CREATE USER IF NOT EXISTS 'replicator'@'%' IDENTIFIED BY 'replica-password-local';
GRANT REPLICATION SLAVE, REPLICATION CLIENT ON *.* TO 'replicator'@'%';
FLUSH PRIVILEGES;
SQL
MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -h mysql-replica -uroot <<'SQL'
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='mysql-primary', SOURCE_PORT=3306,
  SOURCE_USER='replicator', SOURCE_PASSWORD='replica-password-local',
  SOURCE_AUTO_POSITION=1, GET_SOURCE_PUBLIC_KEY=1;
START REPLICA;
SET PERSIST super_read_only=ON;
SQL
echo 'Replication configured with GTID auto-positioning.'
