#!/bin/sh
set -e

if [ ! -d "node_modules" ]; then
    echo "[INFO] node_modules not found. Installing dependencies..."
    pnpm install
fi

pnpm build:silent

pnpm -F server start
