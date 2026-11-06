#!/usr/bin/env python3
"""Generate the wedding site from wedding.config.json + _templates/.

Usage:  python3 build.py

Template syntax:
  {{key.path}}       value, HTML-escaped in .html templates
  {{raw:key.path}}   value inserted as-is (pre-built HTML)
  {{json:key.path}}  value as a JSON/JS literal (the only form substituted in .js templates)
No third-party dependencies.
"""
import html
import json
import re
import sys
import urllib.parse
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
TEMPLATES = ROOT / "_templates"
OUTPUTS = ["index.html", "script.js", "site.webmanifest", "google-apps-script.js", "README.md"]

MONTHS_GEN = ["Ιανουαρίου", "Φεβρουαρίου", "Μαρτίου", "Απριλίου", "Μαΐου", "Ιουνίου",
              "Ιουλίου", "Αυγούστου", "Σεπτεμβρίου", "Οκτωβρίου", "Νοεμβρίου", "Δεκεμβρίου"]
# (article, day) for "την Κυριακή" / "το Σάββατο"
WEEKDAYS = [("τη", "Δευτέρα"), ("την", "Τρίτη"), ("την", "Τετάρτη"), ("την", "Πέμπτη"),
            ("την", "Παρασκευή"), ("το", "Σάββατο"), ("την", "Κυριακή")]

todos = []


def walk_todos(value, path=""):
    if isinstance(value, dict):
        for k, v in value.items():
            if not k.startswith("_"):
                walk_todos(v, f"{path}.{k}" if path else k)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            walk_todos(v, f"{path}[{i}]")
    elif isinstance(value, str) and value.strip().upper().startswith("TODO"):
        todos.append(path)


def is_todo(value):
    return not value or str(value).strip().upper().startswith("TODO")


def esc(s):
    return html.escape(str(s), quote=True)


def parse_date(s):
    return None if is_todo(s) else date.fromisoformat(s)


def digits(s):
    return re.sub(r"\D", "", s or "")


def gr_mobile(phone):
    """'+306983738992' -> ('+306983738992', '698 373 8992')"""
    d = digits(phone)
    if d.startswith("30") and len(d) == 12:
        d = d[2:]
    pretty = f"{d[:3]} {d[3:6]} {d[6:]}" if len(d) == 10 else phone
    return "+30" + d if len(d) == 10 else phone, pretty


def iban_pretty(iban):
    s = re.sub(r"\s", "", iban).upper()
    return s, " ".join(s[i:i + 4] for i in range(0, len(s), 4))


def maps_url(block):
    if block.get("maps_url"):
        return block["maps_url"]
    q = f"{block.get('venue', '')} {block.get('place', '')}".strip()
    return "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote_plus(q)


def build_context(cfg):
    ctx = dict(cfg)
    groom, bride = cfg["groom"], cfg["bride"]
    ctx["couple"] = f"{groom['name']} & {bride['name']}"
    ctx["manifest_description"] = (
        f"Το ηλεκτρονικό προσκλητήριο γάμου του {groom['genitive']} και της {bride['genitive']}.")
    ctx["v"] = cfg["site"]["asset_version"]

    w = cfg["wedding"]
    d = parse_date(w["date"])
    t = None if is_todo(w["time"]) else datetime.strptime(w["time"], "%H:%M").time()
    if d:
        art, day = WEEKDAYS[d.weekday()]
        ctx.update(
            dd=f"{d.day:02d}", mm=f"{d.month:02d}", yy=f"{d.year % 100:02d}",
            date_dots=f"{d.day:02d}.{d.month:02d}.{d.year}",
            date_long=f"{d.day} {MONTHS_GEN[d.month - 1]} {d.year}",
            date_phrase=f"{art} {day} {d.day} {MONTHS_GEN[d.month - 1]} {d.year}",
        )
    else:
        ctx.update(dd="00", mm="00", yy="00", date_dots="00.00.0000",
                   date_long="TODO ημερομηνία", date_phrase="TODO ημερομηνία")
    if t:
        h12 = t.hour % 12 or 12
        ctx["time_12h"] = f"{h12}:{t.minute:02d} {'π.μ.' if t.hour < 12 else 'μ.μ.'}"
    else:
        ctx["time_12h"] = "TODO ώρα"
    # Countdown target with the correct UTC offset (EET/EEST) for that date.
    ctx["wedding_iso"] = (datetime.combine(d, t, ZoneInfo(w["timezone"])).isoformat()
                          if d and t else None)

    dl = parse_date(cfg["rsvp"]["deadline"])
    ctx["rsvp_deadline"] = f"{dl.day} {MONTHS_GEN[dl.month - 1]}" if dl else "TODO"

    ctx["ceremony_maps"] = maps_url(cfg["ceremony"])
    ctx["reception_maps"] = maps_url(cfg["reception"])
    ctx["families_html"] = "<br>".join(esc(x) for x in cfg["families"])
    ctx["koumbaroi_html"] = "<br>".join(esc(x) for x in cfg["koumbaroi"])

    cards = []
    for g in cfg["gifts"]:
        kind = g["type"].upper()
        if kind == "IBAN":
            copy, shown = iban_pretty(g["value"]) if not is_todo(g["value"]) else (g["value"], g["value"])
            icon = "€"
        elif kind == "IRIS":
            copy = digits(g["value"]) or g["value"]
            shown = gr_mobile(g["value"])[1]
            icon = "✦"
        else:
            sys.exit(f"gifts: unknown type {g['type']!r} (use IBAN or IRIS)")
        cards.append(
            f'<div class="bank-card"><span class="bank-icon">{icon}</span><h3>{esc(g["label"])}</h3>'
            f'<button class="copy-gift" data-gift="{kind}" data-copy="{esc(copy)}">{esc(shown)}</button>'
            f'<p class="copy-status">Πατήστε για αντιγραφή</p></div>')
    ctx["gifts_html"] = "".join(cards)

    links = []
    for person in (groom, bride):
        tel, pretty = gr_mobile(person["phone"])
        links.append(f'<a href="tel:{esc(tel)}"><b>{esc(person["name"])}</b><span>{esc(pretty)}</span></a>')
    ctx["contacts_html"] = "".join(links)

    ep = cfg["google"]["apps_script_url"]
    ctx["endpoint"] = "__PENDING_GOOGLE_ENDPOINT__" if is_todo(ep) else ep
    cl = cfg["cloudinary"]
    ctx["cloudinary"] = ({"cloudName": "", "uploadPreset": ""} if is_todo(cl["cloud_name"])
                         else {"cloudName": cl["cloud_name"], "uploadPreset": cl["upload_preset"]})
    ctx["music_src"] = f"{cfg['music']}?v={ctx['v']}"
    return ctx


def lookup(ctx, path):
    cur = ctx
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            raise KeyError(path)
        cur = cur[part]
    return cur


def render(text, ctx, is_html, is_js):
    pattern = (r"\{\{json:([\w.]+)\}\}" if is_js else r"\{\{(?:(raw|json):)?([\w.]+)\}\}")

    def sub(m):
        mode, key = ("json", m.group(1)) if is_js else (m.group(1), m.group(2))
        try:
            val = lookup(ctx, key)
        except KeyError:
            sys.exit(f"Unknown template key: {key}")
        if mode == "json":
            return json.dumps(val, ensure_ascii=False)
        if mode == "raw" or not is_html:
            return str(val)
        return esc(val)

    return re.sub(pattern, sub, text)


def main():
    cfg = json.loads((ROOT / "wedding.config.json").read_text(encoding="utf-8"))
    walk_todos(cfg)
    ctx = build_context(cfg)
    for name in OUTPUTS:
        tpl = (TEMPLATES / name).read_text(encoding="utf-8")
        out = render(tpl, ctx, is_html=name.endswith(".html"), is_js=name.endswith(".js"))
        (ROOT / name).write_text(out, encoding="utf-8", newline="\n")
        print(f"wrote {name}")
    if todos:
        print(f"\n⚠  {len(todos)} value(s) still TODO in wedding.config.json:")
        for p in todos:
            print(f"   - {p}")


if __name__ == "__main__":
    main()
