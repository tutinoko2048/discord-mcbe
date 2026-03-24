#!/bin/bash

# Check if app folder exists
if [ ! -d "app" ]; then
    echo "App folder not found. Running updater..."

    ./updater latest
    if [ $? -ne 0 ]; then
        echo "Failed to run updater"
        exit 1
    fi

    echo "Please set up the .env file before running discord-mcbe."
    exit 1
fi

# Run the application with BUN_BE_BUN=1
BUN_BE_BUN=1 ./updater run app/discord-mcbe.js
