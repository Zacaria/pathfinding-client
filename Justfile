set shell := ["zsh", "-cu"]

install-web:
  cd web && NPM_CONFIG_CACHE=.npm-cache npm install

build-wasm:
  cd web && NPM_CONFIG_CACHE=.npm-cache npm run build:wasm

dev:
  just build-wasm
  cd web && NPM_CONFIG_CACHE=.npm-cache npm run dev

release:
  just build-wasm
  cd web && NPM_CONFIG_CACHE=.npm-cache npm run build
