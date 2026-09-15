# a Stem system for the current directory: `cd .run/<slug> && just --justfile ../../justfile serve <slug> personal`
# account diz qual assinatura Claude paga o agente — o just exige, como o CLI.
# `personal` vem de fábrica; outras contas entram por STEM_ACCOUNTS="nome=~/.claude-nome".
serve slug account:
    bun ../../main.ts serve --new --no-open --slug {{slug}} --tools mcp --account {{account}}

# stem.localhost: o sistema que gerencia os OUTROS, e o banco dele mora fora do repo, em ~/.stem
self account:
    #!/usr/bin/env bash
    set -e
    mkdir -p "$HOME/.stem"
    cd "$HOME/.stem"
    exec bun {{source_directory()}}/main.ts serve --no-open --slug stem --tools mcp --account {{account}} --db "surrealkv://$HOME/.stem/system.skv"

# the manual an agent reads to operate a Stem system over MCP, linked from the main checkout
install:
    #!/usr/bin/env bash
    set -e
    dst="$HOME/.claude/skills/stem"
    src="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/apps/stem/skill"
    [ -d "$src" ] || { echo "não achei $src"; exit 1; }
    if [ -L "$dst" ]; then unlink "$dst"; fi
    if [ -e "$dst" ]; then echo "$dst é diretório real, não symlink — resolva à mão"; exit 1; fi
    ln -s "$src" "$dst"
    echo "$dst -> $src"

# o repo público: recalcula a branch de export a partir do mono, sem tocar em main.
# O split é determinístico — os mesmos commits dão os mesmos SHAs, então o push é
# fast-forward e nunca precisa de --force. Reescrever histórico do mono quebra isso.
export:
    #!/usr/bin/env bash
    set -e
    root="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
    cd "$root"
    git branch -D stem-export >/dev/null 2>&1 || true
    git subtree split --prefix=apps/stem -b stem-export
    echo
    echo "branch stem-export pronta. Para publicar (gesto humano):"
    echo "  gh repo create biliboss/stem --public --description 'A system that starts blank and learns to be built'"
    echo "  git remote add public git@github.com:biliboss/stem.git   # uma vez"
    echo "  git push public stem-export:main"
