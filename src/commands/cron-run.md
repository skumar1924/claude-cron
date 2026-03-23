---
description: Manually trigger a cron job by ID
allowed-tools: Bash(node *)
---

The user wants to manually trigger a cron job. $ARGUMENTS may contain the job ID.

1. If no job ID was provided in $ARGUMENTS, first list jobs:
   `node ~/.claude/plugins/local/claude-cron/commands-js/cron-list.js`
   Then ask the user which job ID they want to run.

2. Trigger the job:
   `node ~/.claude/plugins/local/claude-cron/commands-js/cron-run.js <id>`
   Report exactly what the script prints.
