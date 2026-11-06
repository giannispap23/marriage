# Γιάννης & Αικατερίνη

Ηλεκτρονικό προσκλητήριο γάμου: https://giannispap23.github.io/marriage/

## How it works

Everything specific to the couple (names, date, church, reception, families,
koumbaroi, bank accounts and IRIS, phones, Google Sheet, Cloudinary) lives in
**`wedding.config.json`**. The site files are generated from `_templates/`:

```bash
python3 build.py        # regenerates index.html, script.js, site.webmanifest, google-apps-script.js, README.md
```

Commit the regenerated files and push. GitHub Pages serves the repo root.
Don't edit the generated files directly; edit the config or `_templates/`.
`build.py` warns about any value still marked `TODO`.

When you change images or CSS, bump `site.asset_version` so browsers and
WhatsApp/Facebook pick up the new files.

## One-time setup

### GitHub Pages
Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`.

### Google Sheet (RSVPs, gift clicks, wishes)
1. Create a new Google Sheet. Copy its id from the URL
   (`docs.google.com/spreadsheets/d/<ID>/edit`) into `google.sheet_id`.
2. Run `python3 build.py`, then in the sheet open **Extensions → Apps Script**
   and paste the contents of `google-apps-script.js`.
3. **Deploy → New deployment → Web app**, *Execute as: Me*, *Who has access: Anyone*.
4. Copy the `/exec` URL into `google.apps_script_url`, rebuild and push.

The `Απαντήσεις` tab (RSVPs and gift choices) and the `Ευχολόγιο` tab (wishes)
are created automatically on the first submission. Don't rename or reorder
the `Απαντήσεις` headers, because the script refuses to write if they change.

### Photo uploads (Cloudinary)
In the couple's Cloudinary account create an **unsigned** upload preset and
put the cloud name and preset name into `cloudinary`. Until then the button
tells guests that uploads aren't enabled yet.

### Images with the monogram
`envelope.png`, `envelope-landscape.png`, `share-thumbnail-safe.png` and all
icons (`favicon.png`, `apple-touch-icon.png`, `mstile.png`,
`android-chrome-*.png`) contain the initials. Replace them with files of the
same name and size if the monogram changes.
