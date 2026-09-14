#!/bin/bash
# H4 — the designer writes the programs next to the view, so the first click is already deterministic.
# Runs on its OWN system (never the owner's app). Prints who resolved each click and how long it took.
#   experiments/h4-design-programs.sh [base=http://tarefas-lab.localhost]
set -u
B=${1:-http://tarefas-lab.localhost}
click() { curl -s -X POST "$B$1" -H 'hx-request: true' "${@:2}" -D - -o /dev/null -w "%{http_code} %{time_total}s\n" | tr -d '\r' | grep -iE '^x-resolved-by|^[0-9]{3} ' | tr '\n' ' '; echo; }

t=$(date +%s)
curl -s -X POST "$B/_mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"intent","arguments":{"intent":"Um TODO simples: criar, concluir e reabrir tarefas. Pendentes primeiro."}}}' | sed -n 's/^data: //p' | cut -c1-160
echo "intent $(( $(date +%s) - t ))s"

html=$(curl -s -H 'accept: text/html' "$B/")
add=$(grep -o '<form[^>]*hx-post="[^"]*"' <<<"$html" | grep -v _feedback | grep -o 'hx-post="[^"]*"' | head -1 | cut -d'"' -f2)
field=$(grep -o '<input[^>]*name="[^"]*"' <<<"$html" | grep -v hidden | grep -v palette | head -1 | grep -o 'name="[^"]*"' | cut -d'"' -f2)
echo "form POST $add · field $field"
for i in 1 2; do echo -n "add #$i  "; click "$add" --data-urlencode "$field=h4 tarefa $i"; done

html=$(curl -s -H 'accept: text/html' "$B/")
seen=0; for i in 1 2; do grep -q "h4 tarefa $i" <<<"$html" && seen=$((seen+1)); done
echo "page shows $seen/2"
item=$(grep -o 'hx-post="/[^"_][^"]*"' <<<"$html" | cut -d'"' -f2 | grep -v "^$add\$" | head -1)
echo -n "item action $item  "; click "$item"
html=$(curl -s -H 'accept: text/html' "$B/")
grep -q 'alert-error' <<<"$html" && echo "FAIL view has a broken query" || echo "view renders clean"

curl -s -X POST "$B/_mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"resources/read","params":{"uri":"system://capabilities"}}' | sed -n 's/^data: //p' \
  | python3 -c 'import json,sys; t=json.loads(json.load(sys.stdin)["result"]["contents"][0]["text"]); [print(p["method"],p["route"],"promoted" if p["promoted"] else "candidate","runs",p["runs"],"demoted" if p.get("demoted") else "","|",p["sql"][:100]) for p in t["programs"]]'
