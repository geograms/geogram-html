# Geogram Aurora — update feed (geogram.radio/updates)

This directory is the self-hosted update feed read by the **Geogram Aurora**
in-app updater (Settings → Updates). It exists so the app never has to reach
github.com at runtime (app-store policy friendly).

## Layout

```
updates/
  stable.json          ← latest stable release (one JSON object)
  beta.json            ← latest release incl. pre-releases
  v<version>/          ← the binaries for that version
    aurora.apk
    aurora-linux-x64.tar.gz
    aurora-windows-x64-setup.exe
```

The app fetches `https://geogram.radio/updates/stable.json` (or `beta.json`
when the user opts into betas), compares `version` against the running build,
and downloads the matching per-platform asset.

## Channel JSON schema

```json
{
  "version": "1.2.0",
  "tagName": "v1.2.0",
  "name": "Geogram Aurora 1.2.0",
  "body": "release notes (markdown)",
  "publishedAt": "2026-06-09T12:00:00Z",
  "prerelease": false,
  "assets": [
    { "name": "aurora.apk", "url": "v1.2.0/aurora.apk", "size": 12345678 },
    { "name": "aurora-linux-x64.tar.gz", "url": "v1.2.0/aurora-linux-x64.tar.gz", "size": 23456789 },
    { "name": "aurora-windows-x64-setup.exe", "url": "v1.2.0/aurora-windows-x64-setup.exe", "size": 34567890 }
  ]
}
```

Asset `url`s are **relative to this `updates/` directory**, so the feed works
regardless of the host serving it.

## Publishing a release

From the aurora repo, after building the platform artifacts:

```sh
dart run tool/publish_release.dart \
  --site /path/to/geogram-html \
  --version 1.2.0 \
  --notes RELEASE_NOTES.md \
  build/app/outputs/flutter-apk/aurora.apk \
  dist/aurora-linux-x64.tar.gz \
  build/installer/aurora-windows-x64-setup.exe
```

A pre-release version (e.g. `1.2.0-beta.1`) updates **beta.json** only; a stable
version updates **both** stable.json and beta.json (beta tracks the newest
build). Then commit & push this repo — GitHub Pages serves it at geogram.radio.

### Retention

`publish_release.dart --keep <N>` (default 5) prunes old `v<version>/` folders so
this Pages repo doesn't grow without bound: it keeps the N newest versions plus
whatever stable.json / beta.json currently point at. (Pruning — not Git LFS —
because GitHub Pages does not serve LFS-tracked files over the Pages URL.)
