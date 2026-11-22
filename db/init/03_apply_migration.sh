#!/bin/bash
set -euo pipefail
mysql --protocol=socket -uroot -p"$MYSQL_ROOT_PASSWORD" yemekhane < /migrations/04_degisiklik.sql
echo '04_degisiklik.sql applied on initial database creation.'
