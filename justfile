# a Stem system for the current directory: `cd apps/stem/.run/<slug> && just --justfile ../../justfile serve <slug>`
serve slug:
    bun ../../main.ts serve --new --no-open --slug {{slug}} --tools mcp

# stem.localhost: o sistema que gerencia os OUTROS, e o banco dele mora fora do repo, em ~/.stem
self:
    #!/usr/bin/env bash
    set -e
    mkdir -p "$HOME/.stem"
    cd "$HOME/.stem"
    exec bun {{source_directory()}}/main.ts serve --no-open --slug stem --tools mcp --db "surrealkv://$HOME/.stem/system.skv"

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
