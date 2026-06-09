# Geogram wapp store catalog (geogram.radio/wapps)

This directory is the **wapp store catalog** served at
`https://geogram.radio/wapps`. The Geogram / Aurora in-app store (the `install`
wapp) fetches `https://geogram.radio/wapps/index.json` and downloads each
`<dir>/<name>-<version>.wapp` from here — no github.com dependency.

It is a mirror of the `binaries/` output of the **geograms/wapps** repo. To
refresh it after building new wapps there:

```sh
# from the wapps repo
./build-archive.sh                 # rebuild + repackage all wapps + index.json
./publish-to-website.sh /path/to/geogram-html   # rsync binaries/ -> wapps/
```

Then commit & push this repo; GitHub Pages serves it at geogram.radio.

`index.json` lists every published wapp (file path, id, version, size, title,
description). The store appends `/index.json` to the configured source URL and
resolves each `file` against the same base.
