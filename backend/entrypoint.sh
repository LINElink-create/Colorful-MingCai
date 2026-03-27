#!/bin/sh
set -eu

alembic upgrade head

exec gunicorn app.main:app -c gunicorn.conf.py