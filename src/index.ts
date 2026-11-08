#!/usr/bin/env bun
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { defineCommand, runMain } from "citty";
import { consola } from "consola";
import Table from "cli-table3";

const caddyfile = () => process.env.CADDYFILE ?? `${homedir()}/caddy/Caddyfile`;

// ponytail: regex parse of flat site blocks; switch to a Caddyfile AST lib if blocks ever nest
function parseBlocks(text: string) {
  return [...text.matchAll(/^([^\s{]+)\s*\{([^}]*)\}/gm)].map((m) => ({
    name: m[1],
    body: m[2] ?? "",
    match: m[0],
  }));
}

function portOf(body: string): number | null {
  const p = body.match(/reverse_proxy\s+localhost:(\d+)/)?.[1];
  return p === undefined ? null : Number(p);
}

async function reload() {
  const path = caddyfile();
  try {
    await Bun.$`caddy reload --config ${path}`.quiet();
    consola.success("caddy reloaded");
  } catch {
    consola.warn("caddy reload failed or caddy not found — run it manually");
  }
}

function load() {
  return readFile(caddyfile(), "utf8").catch(() => {
    throw new Error(`Caddyfile not found at ${caddyfile()} (set CADDYFILE env)`);
  });
}

const main = defineCommand({
  meta: { name: "caddy+", version: "0.1.0", description: "Manage local Caddy dev domains" },
  subCommands: {
    list: defineCommand({
      meta: { name: "list", description: "List domains in the Caddyfile" },
      args: {
        json: { type: "boolean", description: "Output as JSON" },
      },
      async run({ args }) {
        const blocks = parseBlocks(await load());
        if (args.json) {
          console.log(JSON.stringify(blocks.map((b) => ({ domain: b.name, port: portOf(b.body) })), null, 2));
          return;
        }
        if (!blocks.length) return consola.warn("No site blocks found");
        const table = new Table({ head: ["Domain", "Port"] });
        for (const b of blocks) table.push([b.name, portOf(b.body) ?? "—"]);
        console.log(table.toString());
        consola.info(`${caddyfile()}`);
      },
    }),
    add: defineCommand({
      meta: { name: "add", description: "Create <name>.localhost for a port" },
      args: {
        name: { type: "positional", required: true, description: "Domain name" },
        port: { type: "positional", required: true, description: "Port to proxy to" },
      },
      async run({ args }) {
        const name = args.name.endsWith(".localhost") ? args.name : `${args.name}.localhost`;
        const port = String(args.port);
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9-]+)*$/.test(args.name)) {
          consola.error(`Invalid name: ${args.name}`);
          process.exitCode = 1;
          return;
        }
        const portNum = Number(port);
        if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
          consola.error(`Invalid port: ${port}`);
          process.exitCode = 1;
          return;
        }
        let text = await load();
        const blocks = parseBlocks(text);
        if (blocks.some((b) => b.name === name)) {
          consola.error(`${name} already exists`);
          process.exitCode = 1;
          return;
        }
        const collision = blocks.find((b) => portOf(b.body) === portNum);
        if (collision) consola.warn(`port ${port} already proxied by ${collision.name}`);
        text = text.trimEnd() + `\n\n${name} {\n    tls internal\n    reverse_proxy localhost:${port}\n}\n`;
        await writeFile(caddyfile(), text);
        consola.success(`${name} → localhost:${port}`);
        await reload();
      },
    }),
    edit: defineCommand({
      meta: { name: "edit", description: "Open the Caddyfile in $EDITOR" },
      async run() {
        consola.info(`${caddyfile()}`);
        const proc = Bun.spawn([process.env.EDITOR ?? "vi", caddyfile()], {
          stdio: ["inherit", "inherit", "inherit"],
        });
        await proc.exited;
        await reload();
      },
    }),
    remove: defineCommand({
      meta: { name: "remove", description: "Remove a site block" },
      args: { name: { type: "positional", required: true, description: "Domain name" } },
      async run({ args }) {
        const name = args.name.endsWith(".localhost") ? args.name : `${args.name}.localhost`;
        const text = await load();
        const block = parseBlocks(text).find((b) => b.name === name);
        if (!block) {
          consola.error(`${name} not found`);
          process.exitCode = 1;
          return;
        }
        await writeFile(caddyfile(), text.replace(block.match, "").replace(/^\n+/, ""));
        consola.success(`${name} removed`);
        await reload();
      },
    }),
    open: defineCommand({
      meta: { name: "open", description: "Open a domain in the browser" },
      args: { name: { type: "positional", required: true, description: "Domain name" } },
      async run({ args }) {
        const name = args.name.endsWith(".localhost") ? args.name : `${args.name}.localhost`;
        const block = parseBlocks(await load()).find((b) => b.name === name);
        if (!block) {
          consola.error(`${name} not found`);
          process.exitCode = 1;
          return;
        }
        const openers: Record<string, string[]> = {
          darwin: ["open"],
          win32: ["cmd", "/c", "start", ""], // ponytail: leading "" so `start` doesn't treat URL as window title
          linux: ["xdg-open"],
        };
        Bun.spawn([...(openers[process.platform] ?? ["xdg-open"]), `http://${name}`]);
        consola.success(`opened http://${name}`);
      },
    }),
  },
});

runMain(main);
