# Pathfinding Demo (Rust WASM + React/shadcn)

This repo contains a web demo for the `pathfinding` crate on crates.io:
- Rust engine compiled to WebAssembly (WASM) in `crates/engine`
- React + shadcn/ui frontend in `web/`

## Prerequisites
- Rust toolchain
- `wasm-pack` (`cargo install wasm-pack`)
- `wasm-bindgen-cli` (`cargo install wasm-bindgen-cli`)
- Node.js + npm (or pnpm/yarn)

## Quickstart

1) Build the WASM engine:

```bash
wasm-pack build crates/engine --target web --out-dir ../../web/src/wasm --out-name engine --no-typescript --no-opt
```

2) Install and run the frontend:

```bash
cd web
npm install
npm run dev
```

## Deploy to Vercel

This repo includes `vercel.json` and `scripts/vercel-build.sh` to install Rust + wasm-pack,
compile the WASM engine, and build the Vite frontend.

The Vercel build script installs Rust + wasm-pack, builds the WASM engine, then builds the Vite
frontend using the published `pathfinding` crate.
