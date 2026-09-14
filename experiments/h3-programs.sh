#!/bin/bash
# H3 — a stateful operation crystallizes: the agent writes the same SurrealQL twice, and the third call
# runs it without a model. Each call prints who resolved it and how long it took; the page must still
# show every row, which proves the program writes what the screens read.
#   experiments/h3-programs.sh [base=http://tarefas.localhost]
set -u
B=${1:-http://tarefas.localhost}
stamp=$(date +%H%M%S)
form() {
  curl -s -X POST "$B$1" -H 'hx-request: true' "${@:2}" -D - -o /dev/null -w "%{http_code} %{time_total}s" \
    | tr -d '\r' | awk '/^x-resolved-by/{sub(/^x-resolved-by: /,""); by=$0} END{print}' ORS='' ; echo
}
resolved() { curl -s -X POST "$B$1" -H 'hx-request: true' "${@:2}" -D - -o /dev/null -w "\n%{http_code} %{time_total}s\n" | tr -d '\r' | grep -E '^x-resolved-by|^[0-9]{3} '; }

echo "== POST /todos ×4"
for i in 1 2 3 4; do echo "-- h3 $stamp #$i"; resolved /todos --data-urlencode "title=h3 $stamp #$i"; done

html=$(curl -s -H 'accept: text/html' "$B/")
seen=0; for i in 1 2 3 4; do grep -q "h3 $stamp #$i" <<<"$html" && seen=$((seen+1)); done
echo "== page shows $seen/4 new rows"

echo "== complete ×3"
for path in $(grep -o 'hx-post="/todos/[^"]*complete"' <<<"$html" | cut -d'"' -f2 | head -3); do
  echo "-- $path"; resolved "$path"
done

html=$(curl -s -H 'accept: text/html' "$B/")
echo "== programs"
curl -s -X POST "$B/_mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/read","params":{"uri":"system://capabilities"}}' | sed -n 's/^data: //p' \
  | python3 -c 'import json,sys; t=json.loads(json.load(sys.stdin)["result"]["contents"][0]["text"]); [print(p["method"],p["route"],"promoted" if p["promoted"] else "candidate","witnesses",p["witnesses"],"runs",p["runs"],"|",p["sql"][:90]) for p in t["programs"]]'
