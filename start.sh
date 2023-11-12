#!/bin/sh
clear

cd .

if [ ! -d "node_modules" ]; then
  ./setup.sh
fi

echo starting...
npm run start
