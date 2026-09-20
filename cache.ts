// cache — a camada nativa do Stem, e ela existe por uma medida, não por padrão
// de mercado.
//
// Medido em 20/09 contra o via-app, 193 imóveis na tabela `property`:
//
//   GET /captacao   457 KB · TTFB 450–770 ms
//   GET /            153 KB · TTFB ~100 ms
//
// O tempo não está na busca — a busca do via-app roda no navegador em 1 a 5 ms,
// sem requisição nenhuma. Está em `page()`: toda visita refaz `viewFor`, roda as
// queries de `spec.data`, lê os tokens e remonta a string inteira da view. O
// custo cresce com o acervo, e o acervo real tem 183 mil anúncios contra os 193
// que hoje estão na tela.
//
// Duas escolhas que valem ser ditas porque a alternativa parece óbvia:
//
// O DRIVER PADRÃO É MEMÓRIA, não Redis. Um processo Stem por slug é a topologia
// real desta casa, e para um processo só a memória já entrega o ganho inteiro
// sem hop de rede. O Redis ganha o lugar dele quando houver mais de uma
// instância do mesmo sistema, ou quando o cache tiver de sobreviver ao deploy —
// as duas coisas que a memória não faz, e nenhuma das duas é hoje.
//
// A INVALIDAÇÃO É POR REVISÃO, não por varredura. Trocar uma view ou um token
// incrementa um número que entra na CHAVE; as entradas velhas ficam órfãs e
// morrem de TTL. `SCAN` com prefixo no Redis é O(n) sobre o banco inteiro e
// trava sob carga, e `FLUSHDB` derruba o cache de todo mundo por causa de uma
// view.
//
// O cache NUNCA pode quebrar a página: todo erro de driver devolve `undefined` e
// a página se monta como se não houvesse cache. Um cache que derruba o que ele
// deveria acelerar é pior que nenhum.

export namespace Cache {
  /** Curto de propósito: o Stem é um sistema que se redesenha, e uma página velha por meio minuto é o teto do aceitável. */
  export const TTL_MS = Number(process.env.STEM_CACHE_TTL_MS ?? 30_000);

  /** O teto do driver de memória, em entradas. Uma view grande tem ~500 KB; 200 delas são ~100 MB, e é aí que ele para de crescer. */
  const MAX_ENTRIES = Number(process.env.STEM_CACHE_MAX ?? 200);

  export interface Driver {
    readonly name: string;
    /** `undefined` quando não há, quando venceu, ou quando o driver falhou — os três casos são o mesmo para quem chama. */
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string, ttlMs?: number): Promise<void>;
    /** A revisão corrente; entra na chave, e é como uma troca de view invalida sem varrer. */
    rev(): Promise<number>;
    /** Incrementa a revisão. Tudo que foi gravado na anterior deixa de ser alcançável. */
    bump(): Promise<void>;
    close(): void;
  }

  /**
   * Memória do processo, com teto e expiração preguiçosa.
   *
   * Não há timer varrendo: uma entrada vencida morre quando alguém a pede, e o
   * teto derruba a mais antiga na hora de inserir. Um `setInterval` de limpeza
   * segura o processo vivo e aparece como vazamento no shutdown.
   */
  class Local implements Driver {
    readonly name = "memory";
    #map = new Map<string, { valor: string; ate: number }>();
    #rev = 0;

    async get(key: string) {
      const e = this.#map.get(key);
      if (!e) return undefined;
      if (e.ate < Date.now()) { this.#map.delete(key); return undefined; }
      // Reinsere para que o Map mantenha a ordem de USO, não a de escrita: sem
      // isto o teto derruba a página mais visitada por ser a mais antiga.
      this.#map.delete(key);
      this.#map.set(key, e);
      return e.valor;
    }

    async set(key: string, valor: string, ttlMs = TTL_MS) {
      if (this.#map.size >= MAX_ENTRIES) {
        const maisVelha = this.#map.keys().next().value;
        if (maisVelha !== undefined) this.#map.delete(maisVelha);
      }
      this.#map.set(key, { valor, ate: Date.now() + ttlMs });
    }

    async rev() { return this.#rev; }
    async bump() { this.#rev++; this.#map.clear(); }
    close() { this.#map.clear(); }
  }

  /**
   * Redis, pelo cliente que o Bun já traz — nenhuma dependência entra no
   * `package.json` por causa disto.
   *
   * A revisão mora no próprio Redis (`INCR`), e é isso que torna o cache
   * correto com mais de uma instância: quem trocou a view incrementa, e as
   * outras instâncias passam a montar chave nova sem nunca terem sido avisadas.
   */
  class Remote implements Driver {
    readonly name = "redis";
    #c: Bun.RedisClient;
    #chaveRev: string;
    /** Um driver que erra a cada request e loga a cada request enche o disco mais rápido que serve página. */
    #avisou = false;

    constructor(url: string, prefixo: string) {
      this.#c = new Bun.RedisClient(url);
      this.#chaveRev = `${prefixo}:rev`;
    }

    #falhou(e: unknown) {
      if (this.#avisou) return;
      this.#avisou = true;
      console.error("[cache] redis indisponível, servindo sem cache:", String(e));
    }

    async get(key: string) {
      try { return (await this.#c.get(key)) ?? undefined; }
      catch (e) { this.#falhou(e); return undefined; }
    }

    async set(key: string, valor: string, ttlMs = TTL_MS) {
      // `PX` e não `EX`: o TTL desta casa é em milissegundos, e arredondar para
      // segundos faz um cache de 500 ms virar um de 0 (imediato) ou 1 s.
      try { await this.#c.send("SET", [key, valor, "PX", String(Math.max(1, Math.round(ttlMs)))]); }
      catch (e) { this.#falhou(e); }
    }

    async rev() {
      try { return Number((await this.#c.get(this.#chaveRev)) ?? 0) || 0; }
      catch (e) { this.#falhou(e); return 0; }
    }

    async bump() {
      try { await this.#c.send("INCR", [this.#chaveRev]); }
      catch (e) { this.#falhou(e); }
    }

    close() { try { this.#c.close(); } catch { /* fechar um socket já morto não é erro */ } }
  }

  /**
   * Abre o driver. `STEM_REDIS_URL` presente escolhe o Redis; ausente, memória.
   *
   * O prefixo é o SLUG do sistema: dois sistemas Stem no mesmo Redis são dois
   * produtos diferentes, e uma chave compartilhada faria a view de um aparecer
   * no outro — o mesmo defeito do `--db` sem caminho, que caía num `.skv`
   * compartilhado e misturava tema e teaching de dois sistemas.
   */
  export function open(slug: string, url = process.env.STEM_REDIS_URL): Driver {
    if (!url) return new Local();
    return new Remote(url, `stem:${slug}`);
  }

  /** A chave de uma página: sistema, revisão e caminho. A revisão no MEIO, para ler o que uma chave é sem decorar posição. */
  export function pageKey(slug: string, rev: number, path: string) {
    return `stem:${slug}:v${rev}:page:${path}`;
  }
}
