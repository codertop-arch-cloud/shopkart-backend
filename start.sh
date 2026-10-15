#!/bin/bash
echo "=== Starting ShopKart Full Stack ==="
cd "$(dirname "$0")"

# 1. Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB service..."
    brew services start mongodb-community 2>/dev/null || brew services start mongodb/brew/mongodb-community 2>/dev/null || mongod --fork --logpath /dev/null 2>/dev/null
fi

# 2. Run backend and frontend together
npm run dev
