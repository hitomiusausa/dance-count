#!/bin/bash
# iOS シミュレーターでアプリを起動して撮る（Mac・Xcode。docs/app-store/RELEASE-PLAN.md §3）。
# 先に npm run ios:build（公開ビルド → ios/ へ写す）。署名なしのシミュレーター用ビルドなので、チームの設定は要らない。
#   tools/ios-sim-check.sh                                  # iPhone 12 mini
#   DC_SIM_DEVICE="iPad Air 11-inch (M3)" tools/ios-sim-check.sh
# 出力: build/ios/screens/<端末>-light.png・-dark.png（ダークでも時計の文字が見えるか＝Info.plist の UIUserInterfaceStyle）
# 2026-11-03 作成。同じ日に Mac（Xcode・iPhone 12 mini）で初回: ビルド・インストールは成功、起動で失敗（下の launch_app の注記）。
# 起動のやり直しは Linux のクラウド環境では動かせないため未実行（Mac で確かめる）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEVICE="${DC_SIM_DEVICE:-iPhone 12 mini}"
BUNDLE_ID="$(node -p "require('fs').readFileSync('$ROOT/capacitor.config.ts','utf8').match(/appId: '([^']+)'/)[1]")"
OUT="$ROOT/build/ios"
SHOTS="$OUT/screens"
mkdir -p "$SHOTS"

# 1. 端末を探す（無ければ、入っている中でいちばん新しい iOS で作る）
UDID="$(xcrun simctl list devices available -j | node -e '
  const name = process.argv[1]; let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const all = Object.entries(JSON.parse(s).devices).filter(([runtime]) => runtime.includes("iOS")).flatMap(([, list]) => list);
    const found = all.find(device => device.name === name); console.log(found ? found.udid : "");
  });' "$DEVICE")"
if [ -z "$UDID" ]; then
  TYPE="$(xcrun simctl list devicetypes -j | node -e '
    const name = process.argv[1]; let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      const found = JSON.parse(s).devicetypes.find(type => type.name === name); console.log(found ? found.identifier : "");
    });' "$DEVICE")"
  RUNTIME="$(xcrun simctl list runtimes available -j | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      const ios = JSON.parse(s).runtimes.filter(runtime => runtime.platform === "iOS" && runtime.isAvailable);
      console.log(ios.length ? ios[ios.length - 1].identifier : "");
    });')"
  if [ -z "$TYPE" ] || [ -z "$RUNTIME" ]; then echo "No simulator type \"$DEVICE\" or no iOS runtime (Xcode → Settings → Components)." >&2; exit 1; fi
  UDID="$(xcrun simctl create "$DEVICE" "$TYPE" "$RUNTIME")"
  echo "created $DEVICE ($RUNTIME): $UDID"
fi
echo "device: $DEVICE $UDID"

# 2. シミュレーター用にビルド（署名なし）
xcodebuild -project "$ROOT/ios/App/App.xcodeproj" -scheme App -configuration Debug \
  -destination "id=$UDID" -derivedDataPath "$OUT/DerivedData" CODE_SIGNING_ALLOWED=NO build | tail -5
APP="$OUT/DerivedData/Build/Products/Debug-iphonesimulator/App.app"
[ -d "$APP" ] || { echo "build output $APP is missing" >&2; exit 1; }

# 3. 起動して撮る（ライト → ダーク。最後にライトへ戻す）
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b >/dev/null
open -a Simulator --args -CurrentDeviceUDID "$UDID" || true
xcrun simctl install "$UDID" "$APP"

# 起動して、本当に動いているのを確かめてから撮る。2026-11-03 の初回（Mac・iPhone 12 mini）: 起動したばかりのシミュレーターは
# 起動画面を作る仕組み（splashboardd）が数分止まり、その間 simctl launch が「No such process」で失敗して画面は真っ黒だった
# （アプリ側は正常＝あとで起動すると WebView まで読み込み、最初の画面が出た）。失敗したら待ってやり直す。
LAUNCH_RETRIES=6
LAUNCH_WAIT_SEC=15
RENDER_WAIT_SEC=6
launch_app() {
  local attempt
  for attempt in $(seq 1 "$LAUNCH_RETRIES"); do
    xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
    if xcrun simctl launch "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 && sleep 2 \
      && xcrun simctl spawn "$UDID" launchctl list | grep -q "UIKitApplication:$BUNDLE_ID"; then
      return 0
    fi
    echo "launch attempt $attempt/$LAUNCH_RETRIES failed; waiting ${LAUNCH_WAIT_SEC}s for the simulator" >&2
    sleep "$LAUNCH_WAIT_SEC"
  done
  echo "Could not launch $BUNDLE_ID. Restart the simulator (xcrun simctl shutdown $UDID) and run this again." >&2
  return 1
}

SAFE_NAME="$(echo "$DEVICE" | tr ' ()' '-__')"
for LOOK in light dark; do
  xcrun simctl ui "$UDID" appearance "$LOOK"
  launch_app
  sleep "$RENDER_WAIT_SEC"
  xcrun simctl io "$UDID" screenshot "$SHOTS/$SAFE_NAME-$LOOK.png" >/dev/null
  echo "screenshot: $SHOTS/$SAFE_NAME-$LOOK.png"
done
xcrun simctl ui "$UDID" appearance light
