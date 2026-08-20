#!/usr/bin/env sh
# HTML → PNG 一键启动（macOS / Linux）
cd "$(dirname "$0")"
node tools/serve.mjs "$@"
