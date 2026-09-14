#!/bin/bash
# Session A shapes landing #1 with 5 corrections and accepts it. Then, per product, a clean session
# writes the first draft without preferences (control) and another with them (treatment); a third
# clean session judges both blind against the compiled preferences.
SP=/private/tmp/claude-501/-Users-billiboss-src-biliboss-mono/e985c80f-5558-4af0-95a3-fa835d2abfc6/scratchpad
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
B=localhost:3999
shot() { "$CH" --headless=new --window-size=900,1100 --virtual-time-budget=4000 --screenshot=$SP/$1.png "http://$B$2" 2>/dev/null; }
post() { curl -s -X POST "$B$1" -H 'hx-request: true' "${@:2}"; echo; }
t() { date +%s; }

T=$(t); post /_intent --data-urlencode path=/navalha --data-urlencode 'intent=Landing page do Navalha, um app de agenda para barbearias: explicar o produto e captar interesse.'; echo "navalha intent $(( $(t)-T ))s"; shot navalha-v1 /navalha
while IFS='|' read -r target instruction; do
  T=$(t); post /_feedback --data-urlencode path=/navalha --data-urlencode "target=$target" --data-urlencode "instruction=$instruction"; echo "feedback $(( $(t)-T ))s"
done <<'F'
page|está com cara de SaaS demais
page|tem caixa demais, deixa o conteúdo respirar
page|não sei o que clicar, tem opção demais
page|muito fofo, arredondado demais
page|texto de marketing, fala como gente fala com o dono da barbearia
F
shot navalha-final /navalha
T=$(t); post /_accept --data-urlencode path=/navalha; echo "accept $(( $(t)-T ))s"

while IFS='|' read -r slug intent; do
  T=$(t); post /_intent --data-urlencode path=/$slug-control --data-urlencode preferences=off --data-urlencode "intent=$intent"; echo "$slug control $(( $(t)-T ))s"; shot $slug-control /$slug-control
  T=$(t); post /_intent --data-urlencode path=/$slug --data-urlencode "intent=$intent"; echo "$slug treatment $(( $(t)-T ))s"; shot $slug /$slug
  T=$(t); post /_judge --data-urlencode control=/$slug-control --data-urlencode treatment=/$slug; echo "$slug judge $(( $(t)-T ))s"
done <<'P'
lavo|Landing page do Lavô, um app de agendamento para lavanderias: explicar o produto e captar interesse.
sorriso|Landing page do Sorriso, um app de agenda e lembretes para dentistas: explicar o produto e captar interesse.
forja|Landing page da Forja, um app de treinos e check-in para academias: explicar o produto e captar interesse.
P
curl -s $B/_system | python3 -c 'import json,sys; s=json.load(sys.stdin); print(json.dumps({"acceptances":s["acceptances"],"preferences":s["preferences"]},ensure_ascii=False,indent=1))'
