#!/usr/bin/env bash
set -euo pipefail

PROJECT_PATH="${1:-/home/vande/popebot-agent}"
APP_URL="${2:-http://localhost:3000}"
CONTROL_TOWER_PATH="${3:-/home/vande/popebot-control-tower}"
CONTROL_TOWER_URL="${4:-http://localhost:3010/dashboard/system-status}"
REPO_ROOT="${5:-/home/vande/popebot-root}"

export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

cd "$PROJECT_PATH"

if [ ! -f package.json ]; then
  echo "package.json not found in $PROJECT_PATH"
  exit 1
fi

mkdir -p .runtime

sync_runtime_file() {
  local source="$1"
  local target="$2"

  if [ -f "$source" ]; then
    mkdir -p "$(dirname "$target")"
    cp "$source" "$target"
  fi
}

# Keep the live WSL runtime aligned with local source patches that are not
# published through the installed package yet.
sync_runtime_file /mnt/d/Popebot/lib/user-preferences.js "$PROJECT_PATH/node_modules/thepopebot/lib/user-preferences.js"
sync_runtime_file /mnt/d/Popebot/lib/ai/index.js "$PROJECT_PATH/node_modules/thepopebot/lib/ai/index.js"
sync_runtime_file /mnt/d/Popebot/lib/ai/router.js "$PROJECT_PATH/node_modules/thepopebot/lib/ai/router.js"
sync_runtime_file /mnt/d/Popebot/lib/ai/model.js "$PROJECT_PATH/node_modules/thepopebot/lib/ai/model.js"
sync_runtime_file /mnt/d/Popebot/lib/ai/model-registry.js "$PROJECT_PATH/node_modules/thepopebot/lib/ai/model-registry.js"
sync_runtime_file /mnt/d/Popebot/lib/ai/agent.js "$PROJECT_PATH/node_modules/thepopebot/lib/ai/agent.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/actions.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/actions.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/chat.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/chat.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/ui/dropdown-menu.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/ui/dropdown-menu.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/chat-header.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/chat-header.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/apathy-logo.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/apathy-logo.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/app-sidebar.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/app-sidebar.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/manual-page.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/manual-page.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/upgrade-dialog.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/upgrade-dialog.js"
sync_runtime_file /mnt/d/Popebot/lib/chat/components/index.js "$PROJECT_PATH/node_modules/thepopebot/lib/chat/components/index.js"
sync_runtime_file /mnt/d/Popebot/agent/app/chat/finalize-chat/route.js "$PROJECT_PATH/app/chat/finalize-chat/route.js"
sync_runtime_file /mnt/d/Popebot/agent/app/login/page.js "$PROJECT_PATH/app/login/page.js"
sync_runtime_file /mnt/d/Popebot/agent/app/components/apathy-logo.jsx "$PROJECT_PATH/app/components/apathy-logo.jsx"
sync_runtime_file /mnt/d/Popebot/agent/app/components/login-form.jsx "$PROJECT_PATH/app/components/login-form.jsx"
sync_runtime_file /mnt/d/Popebot/agent/app/components/setup-form.jsx "$PROJECT_PATH/app/components/setup-form.jsx"
sync_runtime_file /mnt/d/Popebot/agent/app/icon.svg "$PROJECT_PATH/app/icon.svg"

ensure_tmux_session() {
  local session_name="$1"
  local command="$2"
  local log_file="$3"

  if tmux has-session -t "$session_name" 2>/dev/null; then
    return
  fi

  tmux new-session -d -s "$session_name" "cd \"$PROJECT_PATH\" && $command |& tee -a \"$log_file\""
}

if ! pgrep -f "job-runner-server.js" >/dev/null 2>&1; then
  nohup node /mnt/d/Popebot/lib/job-runner/job-runner-server.js > .runtime/job-runner.log 2>&1 &
  sleep 2
fi

ensure_tmux_session \
  "apathy-app" \
  "env JOB_RUNNER_URL=http://127.0.0.1:8787 OPENAI_BASE_URL=http://host.docker.internal:11434/v1 npm run dev -- --hostname 0.0.0.0 --port 3000" \
  "$PROJECT_PATH/.runtime/app.log"

sleep 5

if [ -f "$CONTROL_TOWER_PATH/package.json" ]; then
  mkdir -p "$CONTROL_TOWER_PATH/.runtime"

  sync_runtime_file /mnt/d/Popebot/apps/control-tower/components/dashboard-client.jsx "$CONTROL_TOWER_PATH/components/dashboard-client.jsx"
  sync_runtime_file /mnt/d/Popebot/apps/control-tower/app/globals.css "$CONTROL_TOWER_PATH/app/globals.css"
  sync_runtime_file /mnt/d/Popebot/apps/control-tower/app/icon.svg "$CONTROL_TOWER_PATH/app/icon.svg"

  if ! tmux has-session -t "apathy-control-tower" 2>/dev/null; then
    tmux new-session -d -s "apathy-control-tower" "cd \"$CONTROL_TOWER_PATH\" && env POPEBOT_REPO_ROOT=\"$REPO_ROOT\" DATABASE_PATH=\"$REPO_ROOT/data/thepopebot.sqlite\" CONTROL_TOWER_SKIP_DB=1 npm run dev -- --hostname 0.0.0.0 --port 3010 |& tee -a \"$CONTROL_TOWER_PATH/.runtime/app.log\""
    sleep 5
  fi
fi

echo
echo "PopeBot is starting in WSL."
echo "Project: $PROJECT_PATH"
echo "Open: $APP_URL"
echo "Control Tower: $CONTROL_TOWER_URL"
echo
echo "Recent app log:"
tail -n 20 .runtime/app.log 2>/dev/null || true
if [ -f "$CONTROL_TOWER_PATH/.runtime/app.log" ]; then
  echo
  echo "Recent Control Tower log:"
  tail -n 20 "$CONTROL_TOWER_PATH/.runtime/app.log" 2>/dev/null || true
fi
