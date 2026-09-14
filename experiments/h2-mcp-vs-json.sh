#!/bin/bash
# H2 — the /_mcp server lets a fresh agent discover existing state better than {"query"} replies.
# Same seeded system, same intent, N runs per mode. A run passes when the rendered page shows the
# seeded products, which the agent can only get right by reading the schema it was never told about.
#   experiments/h2-mcp-vs-json.sh [N=3] > experiments/results/h2-<date>.jsonl
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd)
N=${1:-3}
PORT=3998
B=localhost:$PORT
TSX=$HERE/node_modules/.bin/tsx
WORK=${TMPDIR:-/tmp}/acp-h2

mcp_query() {
  curl -s -X POST "$B/_mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"query\",\"arguments\":{\"sql\":$(printf '%s' "$1" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')}}}" >/dev/null
}

for mode in json mcp; do
  for run in $(seq 1 "$N"); do
    dir=$WORK/$mode-$run
    rm -rf "$dir" && mkdir -p "$dir"
    (cd "$dir" && exec "$TSX" "$HERE/backend.ts" --new --no-open --port $PORT --tools $mode) >"$dir/server.log" 2>&1 &
    pid=$!
    until curl -sf "$B/_system" >/dev/null; do sleep 1; done
    mcp_query "CREATE catalogo_item CONTENT { nome: 'Cadeira Ondina', preco_centavos: 89000, estoque: 3 };
               CREATE catalogo_item CONTENT { nome: 'Mesa Tarumã', preco_centavos: 245000, estoque: 0 };
               CREATE catalogo_item CONTENT { nome: 'Luminária Jacarandá', preco_centavos: 42000, estoque: 12 };"
    started=$(date +%s)
    reply=$(curl -s -X POST "$B/_intent" -H 'content-type: application/json' \
      -d '{"intent":"A vitrine da loja: mostre os produtos que já estão cadastrados, com preço em reais e se tem estoque."}')
    html=$(curl -s -H 'accept: text/html' "$B/")
    seen=0
    for name in "Cadeira Ondina" "Mesa Tarumã" "Luminária Jacarandá"; do
      grep -q "$name" <<<"$html" && seen=$((seen + 1))
    done
    python3 -c 'import json,sys; r=json.loads(sys.argv[1] or "{}"); r.update(mode=sys.argv[2], run=int(sys.argv[3]), seconds=int(sys.argv[4]), seeded_seen=int(sys.argv[5]), passed=sys.argv[5]=="3"); print(json.dumps(r))' \
      "$reply" "$mode" "$run" "$(( $(date +%s) - started ))" "$seen"
    kill $pid; wait $pid 2>/dev/null
  done
done
