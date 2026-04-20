#!/bin/bash
cd ~/trend-syria-app/backend
. venv/bin/activate
pkill uvicorn 2>/dev/null
sleep 2
uvicorn server:app --host 0.0.0.0 --port 8001 &
disown
echo "OK"
