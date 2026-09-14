#!/bin/bash
# E2E — a blank system becomes a working TODO through the MCP, and the screen proves each step.
# Every check reads the rendered HTML, the way the browser sees it. Exit 0 only if all pass.
#   experiments/e2e-todo.sh [port=3000]   (the backend must already run on a blank .system)
set -u
B=${1:-localhost:3000}
fail=0
mcp() {
  curl -s -X POST "$B/_mcp" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$1\",\"arguments\":$2}}" | sed -n 's/^data: //p'
}
page() { curl -s -H 'accept: text/html' "$B/"; }
check() { if grep -q "$2" <<<"$3"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; fi; }
# HTMX sends forms urlencoded with hx-request; this reproduces the browser's own request.
form() { curl -s -X POST "$B$1" -H 'hx-request: true' "${@:2}" -o /dev/null -w "%{http_code}"; }
attr() { grep -o "data-system-id=\"$1\"[^>]*" <<<"$2" | grep -o "hx-post=\"[^\"]*\"" | head -1 | cut -d'"' -f2; }

t=$(date +%s)
mcp intent '{"intent":"Um TODO list simples: adicionar tarefas, concluir e reabrir. Pendentes primeiro, concluídas embaixo."}' | cut -c1-160
echo "     intent $(( $(date +%s) - t ))s"
html=$(page)
check "home deixou de ser o bootstrap" 'data-system-id=' "$html"
! grep -q 'O que isto deve se tornar' <<<"$html" || { echo "FAIL ainda é o bootstrap"; fail=1; }

action=$(grep -o '<form[^>]*hx-post="[^"]*"' <<<"$html" | grep -v _feedback | grep -o 'hx-post="[^"]*"' | head -1 | cut -d'"' -f2)
field=$(grep -o '<form[^>]*hx-post="'"$action"'".*</form>' <<<"$html" | grep -o '<input[^>]*name="[^"]*"' | grep -v 'type="hidden"' | head -1 | grep -o 'name="[^"]*"' | cut -d'"' -f2)
echo "     form → POST $action · field $field"
for title in "Comprar leite" "Levar moto na revisão"; do
  t=$(date +%s); code=$(form "$action" --data-urlencode "$field=$title"); echo "     add \"$title\" → $code $(( $(date +%s) - t ))s"
done
html=$(page)
check "as duas tarefas aparecem" 'Comprar leite' "$html"
check "a segunda também" 'Levar moto na revisão' "$html"

complete=$(grep -o 'hx-post="[^"]*"' <<<"$html" | cut -d'"' -f2 | grep -v -e _feedback -e _accept -e "^$action\$" | head -1)
echo "     primeira ação de item → POST $complete"
t=$(date +%s); code=$(form "$complete"); echo "     complete → $code $(( $(date +%s) - t ))s"
html=$(page)
done_block=$(grep -o 'data-system-id="done[^"]*".*' <<<"$html" | head -c 20000)
check "uma tarefa foi para concluídas" 'Comprar leite\|Levar moto' "$done_block"

[ $fail = 0 ] && echo "PASS" || echo "FAILED"
exit $fail
