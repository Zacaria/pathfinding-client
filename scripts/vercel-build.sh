#!/usr/bin/env bash
set -euo pipefail

if ! command -v cargo >/dev/null 2>&1; then
  echo "Installing Rust toolchain..."
  curl https://sh.rustup.rs -sSf | sh -s -- -y
  export PATH="${HOME}/.cargo/bin:${PATH}"
fi

if ! command -v rustup >/dev/null 2>&1; then
  echo "rustup not found after install."
  exit 1
fi

rustup target add wasm32-unknown-unknown

if ! command -v wasm-pack >/dev/null 2>&1; then
  echo "Installing wasm-pack..."
  curl -sSf https://rustwasm.github.io/wasm-pack/installer/init.sh | sh
  export PATH="${HOME}/.cargo/bin:${PATH}"
fi

cd web
npm run build:wasm
npm run build
