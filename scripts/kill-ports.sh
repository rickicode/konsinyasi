#!/bin/bash
# Kill processes on ports 5001, 5002, 5003
for port in 5001 5002 5003; do
  fuser -k -9 $port/tcp 2>/dev/null || true
done
sleep 1
# Kill orphaned workerd (match exact binary, not parent npm/node)
pgrep -f 'workerd-linux-64/bin/workerd' | xargs kill -9 2>/dev/null || true
sleep 2
echo "Ports cleared"
