#!/bin/bash

# Simple GitHub Push Script
echo "🚀 Adding changes..."
git add .

echo "💾 Committing..."
git commit -m "update"

echo "📤 Pushing..."
git push

if [ $? -eq 0 ]; then
    echo "✅ Success!"
else
    echo "❌ Push failed."
fi
