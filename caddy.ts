// caddy — publishes a running system as <slug>.localhost through the Caddy already on this machine.
// It talks to Caddy's admin API, so nothing is written to the repo's Caddyfile and no reload happens:
// the route lives while the process lives, and a `caddy reload` of the Caddyfile drops it.
import { request } from "node:http";
import { createServer } from "node:net";

const ADMIN = process.env.CADDY_ADMIN ?? "http://localhost:2019";

export const Caddy = {
  /**
   * node:http, not fetch: undici sends `sec-fetch-mode: cors`, and Caddy's admin API answers 403 to any
   * request that looks like it came from a browser. Measured 14/09: same URL, curl 200, with that header 403.
   */
  admin(method: string, path: string, body?: unknown): Promise<{ status: number; text: string }> {
    return new Promise((resolve, reject) => {
      const payload = body === undefined ? undefined : JSON.stringify(body);
      const req = request(`${ADMIN}${path}`, { method, headers: payload ? { "content-type": "application/json" } : {} }, (res) => {
        let text = ""; res.on("data", (c) => (text += c)); res.on("end", () => resolve({ status: res.statusCode ?? 0, text }));
      });
      req.on("error", reject);
      req.end(payload);
    });
  },

  /** A port nobody holds right now; the OS picks it. */
  freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const probe = createServer().listen(0, "127.0.0.1", () => {
        const { port } = probe.address() as { port: number };
        probe.close(() => resolve(port));
      }).on("error", reject);
    });
  },

  id: (slug: string) => `system-${slug}`,

  /**
   * The servers on :80 and :443. Both get the route: Safari upgrades a *.localhost it once saw on https,
   * and a route only on :80 answers that upgrade with a TLS error. Caddy issues the local cert itself.
   */
  async httpServers() {
    const res = await Caddy.admin("GET", "/config/apps/http/servers");
    if (res.status !== 200) throw new Error(`caddy admin answered ${res.status}`);
    const servers = JSON.parse(res.text) as Record<string, { listen?: string[] }>;
    const names = Object.entries(servers).filter(([, v]) => v.listen?.some((l) => l.endsWith(":80") || l.endsWith(":443"))).map(([n]) => n);
    if (!names.length) throw new Error("no caddy server listens on :80 or :443");
    return names;
  },

  /** Idempotent: an old route with the same slug is removed first, and the new one goes to the top. */
  async publish(slug: string, port: number) {
    if (!/^[a-z0-9-]+$/.test(slug)) throw new Error(`slug must be [a-z0-9-]: ${slug}`);
    await Caddy.unpublish(slug);
    const servers = await Caddy.httpServers();
    await Promise.all(servers.map(async (server, i) => {
      const route = {
        "@id": `${Caddy.id(slug)}-${i}`,
        match: [{ host: [`${slug}.localhost`] }],
        handle: [{ handler: "reverse_proxy", upstreams: [{ dial: `127.0.0.1:${port}` }],
          // SSE (/_events) must not be buffered, or the page never hears the agent start.
          flush_interval: -1 }],
        terminal: true,
      };
      const res = await Caddy.admin("PUT", `/config/apps/http/servers/${server}/routes/0`, route);
      if (res.status !== 200) throw new Error(`caddy refused the route on ${server}: ${res.status} ${res.text}`);
    }));
    return `http://${slug}.localhost`;
  },

  async unpublish(slug: string) {
    await Promise.all([0, 1].map((i) => Caddy.admin("DELETE", `/id/${Caddy.id(slug)}-${i}`).catch(() => undefined)));
  },
};
