#!/bin/bash
set -e

echo "==> [dev] Initial compilation..."
mvn compile -q

echo "==> [dev] Starting Spring Boot (DevTools hot-reload active)..."
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005" &

touch /tmp/last_change

echo "==> [dev] Watching src/ for .java changes..."
while true; do
  sleep 2
  CHANGED=$(find src -name "*.java" -newer /tmp/last_change 2>/dev/null | head -1)
  if [ -n "$CHANGED" ]; then
    echo "==> [dev] Change detected in $CHANGED — recompiling..."
    touch /tmp/last_change
    mvn compile -q 2>&1 && echo "==> [dev] Recompile OK (DevTools will restart the app)" \
                        || echo "==> [dev] Compile ERROR — fix the code and save again"
  fi
done
