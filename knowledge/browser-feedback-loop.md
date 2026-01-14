# Browser ↔ Dev Feedback Loop (Codex + Playwright MCP Bridge)

This doc explains **what worked**, **what didn’t**, and the **final repeatable process** to get a tight debug loop between:

- the dev server (`just dev`)
- a real browser (Chrome)
- automation/control from the AI (Codex)

It’s written so a new intern can set this up from scratch on macOS.

---

## Quick glossary

- **MCP**: Model Context Protocol (how Codex talks to “tool servers”).
- **Playwright MCP server**: `mcp-server-playwright` (exposes tools like `browser_navigate`, `browser_click`, `browser_console_messages`, …).
- **Playwright MCP Bridge extension**: a Chrome extension that lets the MCP server control an existing Chrome instance.

---

## What worked

### 1) Dev server loop

- `just dev` successfully:
  - builds the Rust WASM package via `wasm-pack`
  - starts the web dev server (Rolldown/Vite)
- The app loads at `http://127.0.0.1:5173/`.

Artifacts you can use while iterating:
- `web-dev.log` (stdout/stderr of the dev process)
- `web-dev.pid` (pid of the background `just dev` command)

### 2) “Unreachable” / uncaught promise rejection is gone

We reproduced the pathfinding flow by driving the UI and checking console logs; the UI no longer shows “unreachable” and the browser console no longer shows an uncaught promise rejection when clicking **Run**.

### 3) Browser automation worked (via Playwright)

Even when Codex’s built-in Playwright MCP tools weren’t usable, we could still automate the app using:
- headless Playwright (to click “Run” and validate metrics)
- a Node script that speaks MCP to `mcp-server-playwright` directly (tooling-level smoke tests)

---

## What did NOT work (and why)

### A) Codex ↔ Playwright MCP integration returned “Transport closed”

Symptoms inside Codex when calling any `mcp__playwright__*` tool:
- immediate error: `Transport closed`

Root cause (practical):
- Codex tries to call MCP “resource” endpoints (e.g. `resources/list`) as part of its MCP handshake / discovery.
- `mcp-server-playwright` (v0.0.55) **does not implement** `resources/list` (it returns “Method not found”).
- Some MCP clients treat that as fatal and terminate the transport → “Transport closed”.

How we confirmed:
- Talking to the server directly over stdio and calling `resources/list` returns `Method not found`.
- Calling `tools/list` works and returns all Playwright tools.

### B) Content-Length framing did not work against this server

If you try to send MCP messages using `Content-Length: ...` framing, the Playwright MCP server won’t respond.

Why:
- The bundled stdio transport used by this Playwright MCP build is **JSON Lines** (one JSON-RPC message per line).

---

## Final process (recommended) — from scratch

### 0) Prereqs

Install tooling:

- Rust toolchain + wasm target:
  - `rustup target add wasm32-unknown-unknown`
- `wasm-pack` (used by `web/package.json`):
  - `cargo install wasm-pack`
- Node + npm (any recent LTS is fine)
- `just`:
  - `brew install just` (or your preferred method)

Install JS deps once:

- `just install-web`

---

## 1) Run the app locally

Start dev:

- `just dev`

Open the app:

- `http://127.0.0.1:5173/`

Stop dev (if you started it in the background via the repo scripts):

- `kill $(cat web-dev.pid)`

Build release (sanity check):

- `just release`

---

## 2) Set up the browser control loop (Chrome + MCP Bridge)

### Option A (preferred): Codex uses Playwright MCP directly

This is the “ideal” loop: Codex can call tools like `browser_click` and read console logs.

1) Install the Playwright MCP server:

- `npm i -g @playwright/mcp@latest`

2) Add the MCP server to Codex:

- `codex mcp add playwright npx "@playwright/mcp@latest"`

3) Install the Chrome extension:

- Install “Playwright MCP Bridge” in Chrome.

4) Restart Codex

Important:
- Codex loads MCP server config at startup; after changing MCP settings, **restart Codex**.

5) Verify connectivity

- In Chrome you should see a tab like `chrome-extension://.../connect.html?...`
- The page should say something like:
  - `MCP client "codex-mcp-client/..." connected.`

6) Use the tools from Codex

Examples of what you should be able to do:
- Navigate: `mcp__playwright__browser_navigate` to `http://127.0.0.1:5173/`
- Click **Run**
- Fetch console output with `mcp__playwright__browser_console_messages`

If you still get `Transport closed`, use Option B.

---

### Option B (works today): “Sidecar” automation script + Chrome extension

This option keeps the same Chrome extension flow, but automation is driven by a Node script that speaks MCP directly.

Why this exists:
- It bypasses Codex’s MCP resource discovery (which can close the transport).

1) Install Playwright MCP + ensure Chrome is installed

- `npm i -g @playwright/mcp@0.0.55`

2) Start the MCP server (in one terminal)

- `mcp-server-playwright --extension`

3) Trigger a browser session + run actions (in another terminal)

Run this one-liner which:
- connects to the MCP server over stdio
- navigates to the app
- clicks **Run**
- prints console messages

```bash
node --input-type=module - <<'NODE'
import mcp from 'playwright-core/lib/mcpBundle.js';

const transport = new mcp.StdioClientTransport({
  command: 'mcp-server-playwright',
  args: ['--extension', '--console-level', 'debug'],
});
const client = new mcp.Client({ name: 'pf-loop', version: '0.0.0' });

await client.connect(transport);

await client.callTool({ name: 'browser_navigate', arguments: { url: 'http://127.0.0.1:5173/' } });
await client.callTool({
  name: 'browser_run_code',
  arguments: {
    code: `async (page) => {
      await page.getByRole('button', { name: /^Run$/ }).click();
      await page.waitForTimeout(500);
      return {
        result: await page.getByText('Result').locator('..').locator('span').nth(1).textContent(),
        time: await page.getByText('Time').locator('..').locator('span').nth(1).textContent(),
      };
    }`,
  },
});

const msgs = await client.callTool({ name: 'browser_console_messages', arguments: { level: 'debug' } });
console.log(JSON.stringify(msgs, null, 2));

await transport.close();
NODE
```

Notes:
- The first tool call may open a Chrome tab to the extension connect page automatically.
- If the connect page doesn’t appear, confirm the extension is installed/enabled in Chrome.

---

## 3) Debugging checklist

### Dev server issues

- Confirm server is running:
  - `lsof -nP -iTCP:5173 -sTCP:LISTEN`
- Check logs:
  - `tail -n 200 web-dev.log`

### WASM issues

- Rebuild WASM:
  - `cd web && npm run build:wasm`
- If the UI shows an engine load error, it’s usually a missing/old `web/src/wasm/*` output.

### MCP issues

- If Codex shows `Transport closed`:
  - Use Option B (“Sidecar” script) to keep shipping.
  - If you want to fix Codex tooling long-term, investigate MCP “resources” compatibility between Codex and `mcp-server-playwright`.

---

## Known limitations / gotchas

- The Playwright MCP server stdio transport uses JSON Lines, not `Content-Length` framing.
- Some MCP hosts/clients will close the connection if `resources/list` isn’t supported.
- After changing `~/.codex/config.toml` or running `codex mcp add/remove`, you usually need to restart Codex.

