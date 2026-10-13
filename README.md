# Atelier — Fingerstyle Studio

A quiet workspace for writing expressive guitar music. Standard notation sits above six-string tablature, with the details of fingerstyle playing close at hand.

**[Open Atelier](https://chingkheinganba231005.github.io/atelier-fingerstyle/)**

## Write and arrange

- Standard notation and aligned six-string TAB, with vector PDF export.
- Per-string tuning selectors, semitone controls, tuning presets and capo.
- Whole through 64th notes, dotted rhythms, tuplets, changing meters and tempos.
- Ties that extend previous notes into empty strings without repeating fret numbers in TAB.
- Multi-string selection for techniques, harmonics, dynamics and sustain.
- Fret entry by keyboard or plus/minus buttons.
- Measures and sections with copy, paste, duplicate, rearrange and undo/redo.
- Comments above and below the score.

## Shape the performance

- Natural, artificial, pinch and tapped harmonics, including high and fractional touch points.
- Hammer-ons, pull-offs, slides, legato slides, vibrato, staccato and palm muting.
- Quiet grace notes, muted plucks, strum directions and left/right-hand tapping.
- Slap bass (SB), nail attack (NA), wrist thump (WT) and bass wrist (BW) markings.
- Let-ring enabled for new notes by default, with per-note control.
- Balanced string dynamics, a 1–200 dynamics range and the original plucked harmonic sound. New harmonics start at 127; normal notes start at 20, 30, 45, 65, 85 and 100 from the lowest string to the highest.
- Steel-string, nylon, warm, bright and bowed tones.
- Natural guitar notes beneath bowed chopstick sections, with independent sustain.
- A meter-aware metronome with first-beat accent, volume control and visible counting.

## Ties and multi-string editing

Select a beat, then tick the strings in the Note inspector. **All six** selects the whole chord. Desktop users can also Shift-click strings in the score.

Choose **Tie** (or press **T**) to extend notes from the immediately preceding beat into the selected empty strings. Existing notes are left untouched. Across a barline, the preceding measure must be rhythmically complete. Dead notes cannot be tied.

Tied notes appear on the staff; their continuing TAB positions stay blank. Editing a tied note's effects changes the original attack. Editing its fret creates a new attack. **Remove ties** clears the selected continuations. Effects apply only to existing selected notes, not empty strings.

## Save and continue

Atelier automatically saves the current score in the same browser on the same device. No sign-in is required, and visitors' scores are separate.

For a reliable backup or to change devices:

1. Choose **File → Save project backup** or **Export → Atelier project**.
2. Keep the downloaded `.atelier.json` file in Files, Drive or another folder.
3. On any device, choose **File → Import Atelier project** and open that file.

Older `.atelier` and compatible `.json` backups still open. The file picker accepts any extension and checks the project's contents. PDF is for sharing and printing; the project backup is the editable original. Clearing browser storage or using private browsing can remove local progress. There is no automatic cross-device cloud sync.

## Export and compatibility

PDFs include vector notation and embedded fonts. MusicXML export carries rhythm, string/fret information, ties and supported techniques into other notation software; interpretation varies by application. Native Guitar Pro files are not supported.

Playback uses synthesized instruments rather than recorded samples. The editor has one rhythmic grid, with per-string ties and sustain; fully independent simultaneous rhythmic voices are not yet supported. Dynamics above 127 are Atelier's gain scale, not MIDI velocity.

The interface adapts to desktop, tablet and phone, with drawn musical controls that do not depend on emoji fonts. On small screens, use **Edit** for the touch inspector and scroll the toolbar for more controls. Audio starts after pressing Play.

## Development

Atelier is a static site with no server, account system or build step. Serve the repository over HTTP to run locally. GitHub Pages serves the repository root.

For the regression suite, run `npm install` followed by `npm test` using Node.js 20 or later. Tests cover ties, batch editing, playback scheduling, harmonic playback, import compatibility, notation and PDF generation. Physical-device Safari/iPad testing remains important for release checks.

Third-party notices are in [`licenses/`](licenses/). Application libraries and PDF fonts are bundled; interface typography uses Google Fonts with local fallback fonts.
