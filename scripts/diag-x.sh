#!/usr/bin/env bash
# Geçici teşhis: X video servislerinin tarayıcıdan (CORS) erişilebilirliği
ID=1585341984679469056
O="Origin: https://duman275.github.io"
echo "== api.fxtwitter.com"; curl -s -m 20 -D - -o /tmp/fx.json -H "$O" "https://api.fxtwitter.com/status/$ID" | grep -i "^HTTP\|access-control" ; head -c 400 /tmp/fx.json; echo
echo "== api.vxtwitter.com"; curl -s -m 20 -D - -o /tmp/vx.json -H "$O" "https://api.vxtwitter.com/Twitter/status/$ID" | grep -i "^HTTP\|access-control"; head -c 300 /tmp/vx.json; echo
echo "== d.fxtwitter.com (doğrudan medya)"; curl -s -m 20 -D - -o /dev/null -H "$O" -A "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile" "https://d.fxtwitter.com/i/status/$ID" | grep -i "^HTTP\|location\|access-control"
echo "== d.vxtwitter.com"; curl -s -m 20 -D - -o /dev/null -H "$O" -A "Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile" "https://d.vxtwitter.com/i/status/$ID" | grep -i "^HTTP\|location\|access-control"
URL=$(python3 -c "import json;d=json.load(open('/tmp/fx.json'));print(d['tweet']['media']['videos'][0]['url'])" 2>/dev/null)
echo "== video.twimg.com: $URL"; [ -n "$URL" ] && curl -s -m 20 -r 0-1000 -D - -o /dev/null -H "$O" -H "Referer: https://duman275.github.io/" "$URL" | grep -i "^HTTP\|access-control\|content-type"
echo "== syndication"; curl -s -m 20 -D - -o /dev/null -H "$O" "https://cdn.syndication.twimg.com/tweet-result?id=$ID&token=4" | grep -i "^HTTP\|access-control"
exit 0
