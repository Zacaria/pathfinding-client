# Pathfinding Demo (Rust WASM + React/shadcn)

This repo contains a web demo for the local `../pathfinding` crate:
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
