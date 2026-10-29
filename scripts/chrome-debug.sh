#!/usr/bin/env bash
# 启动一个独立 Chrome（独立 profile + 调试端口），不影响日常浏览器。
# 首次使用需在这个窗口里登录一次 X。
set -euo pipefail
PORT="${XDP_PORT:-9222}"
PROFILE="${XDP_PROFILE:-$HOME/.xpub-chrome-profile}"
CHROME="${XDP_CHROME:-}"
if [ -z "$CHROME" ]; then
  case "$(uname -s)" in
    Darwin) CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ;;
    *) CHROME="$(command -v google-chrome || command -v chromium || command -v google-chrome-stable || true)" ;;
  esac
fi
[ -x "$CHROME" ] || { echo "找不到 Chrome，可设置 XDP_CHROME=<可执行文件路径>"; exit 1; }
mkdir -p "$PROFILE"
echo "启动: $CHROME"
echo "  配置: $PROFILE"
echo "  端口: $PORT"
"$CHROME" --user-data-dir="$PROFILE" --remote-debugging-port="$PORT" \
  --remote-allow-origins='*' --no-first-run --no-default-browser-check \
  --window-size=1280,900 "https://x.com/home" >/tmp/xpub-chrome.log 2>&1 &
for i in $(seq 1 15); do
  sleep 1
  if curl -s --max-time 2 "http://127.0.0.1:$PORT/json/version" >/dev/null; then
    echo "就绪：http://127.0.0.1:$PORT"
    echo "如果这是第一次：请在弹出的窗口里登录 X（只需一次）"
    exit 0
  fi
done
echo "端口未就绪，见 /tmp/xpub-chrome.log"; exit 1
