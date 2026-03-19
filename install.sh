#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="$HOME/.claude/plugins/local/claude-cron"

echo "Building dashboard..."
npm run build

echo "Installing plugin to $PLUGIN_DIR..."
mkdir -p "$PLUGIN_DIR/server/public" "$PLUGIN_DIR/hooks" "$PLUGIN_DIR/commands"

cp plugin.json "$PLUGIN_DIR/"
cp src/server/index.js src/server/db.js src/server/scheduler.js "$PLUGIN_DIR/server/"
cp src/hooks/session-start.js src/hooks/session-stop.js "$PLUGIN_DIR/hooks/"
cp src/commands/cron.js src/commands/cron-list.js src/commands/cron-run.js "$PLUGIN_DIR/commands/"
cp -r dist/. "$PLUGIN_DIR/server/public/"

echo "Installing production dependencies..."
cd "$PLUGIN_DIR"
npm init -y > /dev/null
npm install better-sqlite3 cronstrue cron-parser express open uuid --save-prod --silent

echo "Done. Restart Claude Code and run /cron to open the dashboard."
