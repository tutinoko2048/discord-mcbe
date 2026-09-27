#!/bin/bash

LAUNCHER_VERSION=$(./updater --version 2>/dev/null || true)

# Check if app folder exists
if [ ! -d "app" ]; then
    echo "App folder not found. Running updater..."

    ./updater stable
    if [ $? -ne 0 ]; then
        echo "Failed to run updater"
        exit 1
    fi

    echo "Please set up the .env file before running discord-mcbe."
    exit 1
fi

# Run the application with BUN_BE_BUN=1 and pass launcher version
LAUNCHER_VERSION="$LAUNCHER_VERSION" BUN_BE_BUN=1 ./updater run app/discord-mcbe.js
