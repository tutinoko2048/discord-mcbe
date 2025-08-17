#!/bin/sh
clear

cd .

if [ ! -d "node_modules" ]; then
  ./setup.sh
fi

echo starting...

cd projects/server
pnpm run start
