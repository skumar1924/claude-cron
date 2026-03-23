# claude-cron

A scheduled job manager for [Claude Code](https://claude.ai/code). Define prompts that run on a cron schedule — Claude executes them autonomously in the background. A built-in Express dashboard lets you monitor runs, view outputs, track costs, and trigger jobs manually.

## Prerequisites

- Node.js 18+
- [Claude Code](https://claude.ai/code) CLI installed and authenticated

## Install

```bash
git clone https://github.com/skumar1924/claude-cron
cd claude-cron
./install.sh
```

Then restart Claude Code.

## Usage

| Command | Description |
|---------|-------------|
| `/cron` | Open the dashboard in your browser (starts server if needed) |
| `/cron-list` | List all jobs inline in the chat |
| `/cron-run <job-id>` | Manually trigger a job by ID |

The dashboard lets you:
- Create, edit, and delete jobs
- View run history with output, cost, and token usage
- Trigger jobs manually
- See a live-preview of your cron schedule

## How it works

- **Scheduler** — An Express server runs in the background, polling every minute (aligned to wall-clock boundaries) and firing jobs whose cron expression matches the current time.
- **Execution** — Each job spawns `claude -p --dangerously-skip-permissions --output-format json` with your prompt. Output, cost, and token usage are captured and stored.
- **Storage** — SQLite database at `~/.claude/plugins/local/claude-cron/data.db`.
- **Hooks** — `SessionStart` starts the server if it isn't running; `Stop` records the session end.
- **Concurrency guard** — SQLite's single-writer guarantee prevents duplicate runs if the scheduler fires while a job is already executing.
- **Built-in job** — A `cron-health-digest` job (Mondays at 8am) uses Claude to summarise the past week's run history.

## Uninstall

```bash
rm -rf ~/.claude/plugins/local/claude-cron
```

Then remove the `"claude-cron@local"` entry from `~/.claude/settings.json` under `enabledPlugins`.
