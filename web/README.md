# Pathfinding Demo UI (React + shadcn/ui)

The UI is a React + TypeScript app styled with shadcn/ui conventions (Tailwind + Radix primitives). It calls into a Rust WebAssembly engine built from `../crates/engine`.

## Prerequisites
- `wasm-pack` (`cargo install wasm-pack`)
- `wasm-bindgen-cli` (`cargo install wasm-bindgen-cli`)
- Node.js + npm

## Setup

```bash
npm install
npm test
npm run build:wasm
npm run dev
```
