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

echo "Registering plugin in Claude Code settings..."
SETTINGS="$HOME/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  node -e "
    const fs = require('fs');
    const s = JSON.parse(fs.readFileSync('$SETTINGS', 'utf8'));
    s.enabledPlugins = s.enabledPlugins || {};
    s.enabledPlugins['claude-cron@local'] = true;
    fs.writeFileSync('$SETTINGS', JSON.stringify(s, null, 2) + '\n');
  "
else
  echo '{ "enabledPlugins": { "claude-cron@local": true } }' > "$SETTINGS"
fi

echo "Done. Restart Claude Code and run /cron to open the dashboard."
