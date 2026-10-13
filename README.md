# Atelier — Fingerstyle Studio

A browser-based guitar score editor with standard notation above six-string tablature. This is the exact app release with tuning dropdowns, semitone buttons, and per-note natural guitar sounds underneath bowed chopstick sections.

## Launch on GitHub Pages — no build or API keys

1. Visit https://github.com/new and select the GitHub account you want to own the app.
2. Name the repository `atelier-fingerstyle`, choose **Public**, and enable **Add README**. Create the repository.
3. Extract the downloaded ZIP. In the repository, choose **Add file → Upload files**. Upload the extracted files and the complete `fonts` and `licenses` folders. Upload the CONTENTS, not the ZIP and not an enclosing folder. `index.html` must be at the repository root, beside `app.js` and `style.css`. Commit the upload to `main`. The packaged README can replace the initial README.
4. Go to **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/(root)**. Click **Save**.
5. Wait for the Pages deployment to finish. GitHub displays the live URL in Settings → Pages. For a repository named `atelier-fingerstyle`, its usual form is `https://YOUR-USERNAME.github.io/atelier-fingerstyle/`.

The ZIP includes `.nojekyll` to disable Jekyll processing. If your file picker hides it, you may create an empty `.nojekyll` file at the repository root using **Add file → Create new file**. No custom GitHub Actions workflow is needed.

Official instructions: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Before moving an existing composition

In the original app, choose **Export → Atelier project** and download your composition. In the GitHub Pages app, choose **File → Import Atelier project**. Browser autosave belongs to each website origin, so it does not automatically transfer to the new URL. Importing your backup preserves the notes and settings.

## Features

- Standard staff above six-string tablature, rendered with VexFlow.
- Individual string pitch selectors and semitone controls, tuning presets and capo.
- Tempo and meter changes, whole through 64th notes, dots and tuplets.
- Harmonics, quiet grace notes, dead notes, tapping, slides, hammer-ons and pull-offs.
- SB, NA, WT and BW percussion markings; strum direction and per-note sustain.
- Steel-string, nylon, warm, bright and bowed synthesized sounds.
- Per-note sound overrides: natural tapped bass can sustain below bowed treble.
- Section and measure editing, undo/redo and browser autosave.
- Embedded-font vector PDF, print output, MusicXML, and editable project backups.

## Check your public demo

- Open the live URL in a private/incognito window. The included demo should load without an account.
- Press Play, then try a tuning dropdown and a semitone button under Guitar.
- Select a bass note in a bowed measure. In Note, choose Natural guitar and enable Let this note ring.
- Export a PDF and check that staff, frets and labels appear.
- Export and reimport an Atelier project to check your backup workflow.
- Test on the phone/tablet/browser you intend to support. Sound starts only after a user gesture such as Play.

## Storage and hosting

No backend, database, account system or API keys are required. Each visitor edits their own browser-local score; visitors do not overwrite one another. Export backups for long-term storage or device transfer. The optional Google Fonts stylesheet enhances interface typography; fallback fonts are available. PDF fonts and application libraries are bundled locally.

All local assets use relative URLs, so the app works at a GitHub project subpath. Preserve the filenames and `fonts/` folder or PDF export will fail.

## Current limits

Playback is synthesis rather than recorded instrument samples. One rhythmic voice is engraved, with independent sustain per note. Native Guitar Pro import/export and independent simultaneous bass/melody rhythmic voices are not yet included. MusicXML preserves technical information where supported by the receiving notation program.

## Local development

Serve this directory over HTTP, for example with `python3 -m http.server 8080`, then visit `http://localhost:8080`. No install or build step is needed.

## Updating

Commit edited files to `main`. GitHub Pages republishes from the same root folder. There is no automatic synchronization with another hosted copy of Atelier; keep the desired release files in this repository.

Third-party license notices are in `licenses/`. Public hosting does not itself set a reuse license for the app's original source.
