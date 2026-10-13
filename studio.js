/* Shared engraving, selection and sound helpers. No network services required. */
"use strict";
let selectedStrings = new Set([1]);
let playbackTail = 0;
let clickAccent = true;
let clickVolume = 0.65;

function icon(name) {
  const paths = {
    play: '<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>',
    rewind: '<path d="M6 5v14m12-14L8 12l10 7Z"/>',
    loop: '<path d="M19 8a8 8 0 0 0-13-2L3 9m0-5v5h5m-3 7a8 8 0 0 0 13 2l3-3m0 5v-5h-5"/>',
    undo: '<path d="M3 10h10a7 7 0 0 1 0 14M3 10l5-5m-5 5 5 5" transform="translate(0 -3)"/>',
    redo: '<path d="M21 10H11a7 7 0 0 0 0 14m10-14-5-5m5 5-5 5" transform="translate(0 -3)"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    export: '<path d="M13 5h6v6m0-6L9 15M5 8v11h11v-4"/>',
    score: '<path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/>',
    settings: '<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
    trash: '<path d="M4 7h16M9 4h6M6 7l1 13h10l1-13M10 10v7m4-7v7"/>',
    rest: '<path d="m10 3 5 5-5 4 5 5c-8-4-9 2-4 4"/>',
    tie: '<path d="M4 8q8 12 16 0M4 8q8 8 16 0" fill="currentColor"/>',
    click: '<path d="m9 3-5 17h16L15 3Zm-3 9 8-7M8 17h8"/>',
    volume: '<path d="M4 10h4l5-5v14l-5-5H4Zm12-2q4 4 0 8m3-11q7 7 0 14"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3l-1 1m0 3h.01"/>',
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.score}</svg>`;
}

function durationIcon(den) {
  const open = den <= 2;
  let body = `<ellipse cx="9" cy="24" rx="5.7" ry="3.6" transform="rotate(-20 9 24)" fill="${open ? "none" : "currentColor"}" stroke="currentColor" stroke-width="${den === 1 ? 2.4 : 1.8}"/>`;
  if (den > 1)
    body += '<path d="M14 23V3" stroke="currentColor" stroke-width="1.7"/>';
  for (let f = 0; f < Math.max(0, Math.log2(den) - 2); f++) {
    const y = 3 + f * 4.8;
    body += `<path d="M14 ${y}c0 5 9 4 5 12 2-6-5-5-5-8Z" fill="currentColor"/>`;
  }
  return `<svg class="duration-icon" viewBox="0 0 28 34" aria-hidden="true" focusable="false">${body}</svg>`;
}

function adjacentEvent(bi, ei, direction = -1) {
  const b = project.bars[bi];
  if (b.events[ei + direction]) return b.events[ei + direction];
  const other = project.bars[bi + direction];
  if (!other?.events.length) return null;
  // Unfilled measure time is silence; a tie cannot jump across it.
  const boundary = direction < 0 ? bi - 1 : bi;
  if (Math.abs(used(project.bars[boundary]) - capacity(boundary)) > 0.001)
    return null;
  return direction < 0 ? other.events.at(-1) : other.events[0];
}

function normalizeTies() {
  project.bars.forEach((b, bi) =>
    b.events.forEach((e, ei) => {
      const previous = adjacentEvent(bi, ei);
      e.notes = e.notes.flatMap((n) => {
        if (!n.tie) return [n];
        const source = previous?.notes.find(
          (p) => p.string === n.string && p.fret !== "x",
        );
        if (!source || (n.tieFrom && n.tieFrom !== previous.id)) return [];
        return [
          { ...clone(source), tie: true, tieFrom: previous.id, grace: null },
        ];
      });
    }),
  );
}

function tieSelected() {
  const e = currentEvent(),
    prev = adjacentEvent(selection.bar, selection.event);
  if (!e || !prev)
    return toast(
      "Select an empty beat immediately after a note. Fill any preceding measure first.",
    );
  const additions = [...selectedStrings].flatMap((s) => {
    const n = prev.notes.find((n) => n.string === s && n.fret !== "x");
    return n && !e.notes.some((n) => n.string === s)
      ? [{ ...clone(n), tie: true, tieFrom: prev.id, grace: null }]
      : [];
  });
  if (!additions.length)
    return toast(
      "No empty selected strings have a preceding pitched note. Existing notes are never overwritten.",
    );
  change(() => e.notes.push(...additions));
  toast(
    `Extended ${additions.length} ${additions.length === 1 ? "string" : "strings"} without another attack.`,
  );
}

function selectedNotes() {
  const e = currentEvent();
  if (!e) return [];
  const ns = [];
  for (const s of selectedStrings) {
    let n = e.notes.find((n) => n.string === s);
    let bi = selection.bar,
      ei = selection.event;
    // Editing a continuation edits the original attack for the whole tied chain.
    while (n?.tie) {
      if (ei > 0) ei--;
      else {
        bi--;
        ei = project.bars[bi]?.events.length - 1;
      }
      n = project.bars[bi]?.events[ei]?.notes.find((n) => n.string === s);
    }
    if (n) ns.push(n);
  }
  return ns;
}

function enhanceInspector() {
  if (panel !== "note") return;
  const entry = $(".fret-entry");
  entry.insertAdjacentHTML(
    "beforebegin",
    `<div class="selection-tools"><span>${selectedStrings.size} string${selectedStrings.size === 1 ? "" : "s"} selected</span><button id="select-all-strings">All six</button><button id="select-one-string">Only ${selection.string}</button></div>`,
  );
  $("#select-all-strings").onclick = () => {
    selectedStrings = new Set([1, 2, 3, 4, 5, 6]);
    renderInspector();
    drawSelection();
  };
  $("#select-one-string").onclick = () => {
    selectedStrings = new Set([selection.string]);
    renderInspector();
    drawSelection();
  };
  $$(".string-row").forEach((row) => {
    const s = +row.querySelector("[data-string]").dataset.string;
    const selected = selectedStrings.has(s);
    row.classList.toggle("active", selected);
    row.insertAdjacentHTML(
      "afterbegin",
      `<input class="string-check" type="checkbox" aria-label="Select string ${s} for batch editing" ${selected ? "checked" : ""}>`,
    );
    row.querySelector(".string-check").onchange = () =>
      setSelection(selection.bar, selection.event, s, true);
    const fret = row.querySelector("[data-fret]");
    for (const step of [-1, 1]) {
      const button = document.createElement("button");
      button.className = "fret-step";
      button.innerHTML = icon(step > 0 ? "plus" : "minus");
      button.setAttribute(
        "aria-label",
        `${step > 0 ? "Raise" : "Lower"} fret on string ${s}`,
      );
      button.onclick = () => {
        const n = currentEvent()?.notes.find((n) => n.string === s);
        const f = typeof n?.fret === "number" ? n.fret + step : 0;
        setFret(s, Math.max(0, Math.min(n?.harmonic ? 36 : 24, f)));
      };
      if (step < 0) fret.before(button);
      else fret.after(button);
    }
    const n = currentEvent()?.notes.find((n) => n.string === s);
    if (n?.tie) {
      fret.title = "Tied continuation. Editing its fret creates a new attack.";
      row.classList.add("tied-row");
    }
  });
  entry.insertAdjacentHTML(
    "afterend",
    `<div class="row-fields tie-actions"><button class="full" id="tie-selection">${icon("tie")} Tie into empty strings</button><button class="full" id="remove-ties">Remove ties</button></div><p class="muted">Tick strings to edit them together. Effects change existing notes only; ties fill empty selected strings from the previous beat.</p><label class="switch-row"><span>Let new notes ring by default</span><input id="default-let-ring" type="checkbox" ${defaultLetRing ? "checked" : ""}></label>`,
  );
  $("#tie-selection").onclick = tieSelected;
  $("#remove-ties").onclick = () =>
    change(() => {
      if (currentEvent())
        currentEvent().notes = currentEvent().notes.filter(
          (n) => !(n.tie && selectedStrings.has(n.string)),
        );
    });
  $("#default-let-ring").onchange = (ev) =>
    change(() => {
      defaultLetRing = ev.target.checked;
      project.defaultLetRing = defaultLetRing;
    });
  const ns = selectedNotes();
  for (const id of [
    "harmonic",
    "harmonic-interval",
    "note-tone",
    "sustain",
    "velocity",
    "grace",
  ]) {
    const control = $("#" + id);
    if (control) control.disabled = ns.length === 0;
  }
  $$("[data-tech]").forEach((button) => {
    button.disabled = ns.length === 0;
    const count = ns.filter((n) => n.tech.includes(button.dataset.tech)).length;
    button.classList.toggle("active", count > 0 && count === ns.length);
    button.classList.toggle("mixed", count > 0 && count < ns.length);
    button.setAttribute(
      "aria-pressed",
      count && count < ns.length ? "mixed" : String(count > 0),
    );
  });
  const sustain = $("#sustain");
  sustain.checked = ns.length > 0 && ns.every((n) => n.sustain);
  sustain.indeterminate = ns.some((n) => n.sustain) && !sustain.checked;
  sustain.previousElementSibling.textContent = "Let selected notes ring";
  $("#note-tone").previousElementSibling.textContent = "Sound · selected notes";
  if (ns.length > 1) {
    for (const [id, key] of [
      ["harmonic", "harmonic"],
      ["note-tone", "tone"],
    ]) {
      const control = $("#" + id);
      if (ns.some((n) => (n[key] || "") !== (ns[0][key] || ""))) {
        const option = new Option(
          "Mixed · choose to apply to all",
          "__mixed",
          true,
          true,
        );
        option.disabled = true;
        control.add(option, 0);
      }
    }
  }
  const velocity = $("#velocity");
  if (ns.some((n) => n.velocity !== ns[0]?.velocity))
    velocity.previousElementSibling.textContent =
      "Note dynamics · mixed (1–200)";
  velocity.oninput = () =>
    (velocity.previousElementSibling.textContent = `Note dynamics · ${velocity.value}/200`);
  $("#audition-chord").innerHTML = icon("play") + " Audition this chord";
}

function drawConnections() {
  const byPosition = new Map(locations.map((l) => [`${l.bar}:${l.event}`, l]));
  for (const to of locations) {
    const e = project.bars[to.bar].events[to.event];
    const previous = adjacentEvent(to.bar, to.event);
    if (!previous) continue;
    const bi = to.event ? to.bar : to.bar - 1;
    const ei = to.event ? to.event - 1 : project.bars[bi].events.length - 1;
    const from = byPosition.get(`${bi}:${ei}`);
    if (!from) continue;
    e.notes.forEach((n) => {
      const source = previous.notes.find((p) => p.string === n.string);
      if (!source) return;
      if (n.tie) {
        const first = from.sn._atelierNotes.findIndex(
          (p) => p.string === n.string,
        );
        const last = to.sn._atelierNotes.findIndex(
          (p) => p.string === n.string,
        );
        const draw = (left, right, ctx) => {
          const tie = new Vex.Flow.StaveTie({
            first_note: left,
            last_note: right,
            first_indices: [first],
            last_indices: [last],
          });
          tie.setStyle({ fillStyle: "#24332b", strokeStyle: "#24332b" });
          tie.setContext(ctx).draw();
        };
        if (from.svg === to.svg) draw(from.sn, to.sn, to.ctx);
        else {
          draw(from.sn, undefined, from.ctx);
          draw(undefined, to.sn, to.ctx);
        }
        return;
      }
      const technique = source.tech.find((t) =>
        ["H", "P", "/", "\\", "LS"].includes(t),
      );
      if (!technique || source.tie || source.fret === "x" || n.fret === "x")
        return;
      const up = pitchOf(n) >= pitchOf(source);
      const segment = (svg, x1, x2, y, label) => {
        const attrs = {
          stroke: "#172c24",
          "stroke-width": 2.1,
          fill: "none",
          "stroke-linecap": "round",
          class: "technique-connection",
        };
        if (["/", "\\", "LS"].includes(technique))
          svg.appendChild(
            svgEl("path", {
              ...attrs,
              d: `M${x1} ${y + (up ? 4 : -4)}L${x2} ${y + (up ? -4 : 4)}`,
            }),
          );
        if (["H", "P", "LS"].includes(technique))
          svg.appendChild(
            svgEl("path", {
              ...attrs,
              d: `M${x1} ${y - 6}Q${(x1 + x2) / 2} ${y - 25} ${x2} ${y - 6}`,
            }),
          );
        if (label && technique !== "/" && technique !== "\\")
          textSvg(svg, (x1 + x2) / 2, y - 16, technique, {
            fill: "#172c24",
            "font-size": 9,
            "font-weight": 700,
            "text-anchor": "middle",
          });
      };
      if (from.svg === to.svg)
        segment(
          to.svg,
          from.x + 10,
          to.x - 9,
          to.tab.getYForLine(n.string - 1),
          true,
        );
      else {
        segment(
          from.svg,
          from.x + 10,
          1078,
          from.tab.getYForLine(n.string - 1),
          true,
        );
        segment(
          to.svg,
          to.tab.getNoteStartX() - 12,
          to.x - 9,
          to.tab.getYForLine(n.string - 1),
          false,
        );
      }
    });
  }
}

function hideTiedTabPositions(tn) {
  // VexFlow clears the staff line behind every fret, including empty text.
  // Keep the formatted column, but omit those glyphs entirely while drawing.
  const draw = tn.drawPositions;
  tn.drawPositions = function () {
    const positions = this.positions,
      ys = this.ys,
      glyphs = this.glyphPropsArr;
    const visible = positions
      .map((p, i) => (p.fret === "" ? -1 : i))
      .filter((i) => i >= 0);
    this.positions = visible.map((i) => positions[i]);
    this.ys = visible.map((i) => ys[i]);
    this.glyphPropsArr = visible.map((i) => glyphs[i]);
    try {
      return draw.call(this);
    } finally {
      this.positions = positions;
      this.ys = ys;
      this.glyphPropsArr = glyphs;
    }
  };
}

function soundingDuration(items, index, n, end) {
  const item = items[index];
  let duration = item.duration;
  let nextAttack = null;
  for (let i = index + 1; i < items.length; i++) {
    const next = items[i].data.notes.find((p) => p.string === n.string);
    if (next && !next.tie) {
      nextAttack = items[i].time - item.time;
      break;
    }
    if (next?.tie) duration = items[i].time + items[i].duration - item.time;
    else if (!n.sustain) break;
  }
  if (n.sustain)
    duration =
      nextAttack ?? Math.max(duration, Math.min(18, end - item.time + 3));
  if (n.tech.some((t) => ["PM", "ST"].includes(t)))
    duration = Math.min(duration, item.duration * 0.45, 0.16);
  return Math.max(0.045, duration);
}

function updateZoom() {
  const container = $("#score-scroll");
  const base = Math.max(660, Math.min(1120, container.clientWidth - 60));
  $("#paper").style.width = Math.round((base * zoom) / 100) + "px";
  $("#zoom-label").textContent = zoom + "%";
}

function initStudio() {
  const buttons = {
    undo: ["undo"],
    redo: ["redo"],
    play: ["play"],
    rewind: ["rewind"],
    loop: ["loop"],
    help: ["help", "Guide"],
    "file-menu": ["down", "File"],
    export: ["export", "Export"],
    "insert-note": ["plus", "Note"],
    "insert-rest": ["rest", "Rest"],
    "delete-event": ["trash"],
    "tie-notes": ["tie", "Tie"],
    "zoom-in": ["plus"],
    "zoom-out": ["minus"],
    "inspector-toggle": ["settings", "Edit"],
    "close-inspector": ["close"],
    "modal-close": ["close"],
    "score-mode": ["score", "Score"],
    "add-bar": ["plus", "Add measure"],
    "add-section": ["plus"],
  };
  for (const [id, [name, label]] of Object.entries(buttons))
    $("#" + id).innerHTML = icon(name) + (label ? `<span>${label}</span>` : "");
  $("#tie-notes").onclick = tieSelected;
  $("#metronome").innerHTML = icon("click");
  $("#metronome").setAttribute("aria-pressed", "false");
  $("#metronome").insertAdjacentHTML(
    "afterend",
    '<button id="click-settings" title="Metronome settings" aria-label="Metronome settings">' +
      icon("settings") +
      '</button><span id="beat-count" aria-label="Current metronome beat"></span>',
  );
  $("#metronome").onclick = () => {
    metronome = !metronome;
    $("#metronome").classList.toggle("active", metronome);
    $("#metronome").setAttribute("aria-pressed", String(metronome));
    toast(
      `Metronome ${metronome ? "on" : "off"}. Counts the written meter; tempo is quarter-note BPM.`,
    );
  };
  $("#click-settings").onclick = () => {
    modal(
      "Metronome",
      `<div class="help-content"><p>Counts each beat of the time signature, following meter and tempo changes. In 6/8, six eighth-note clicks; BPM always counts quarter notes.</p><label class="switch-row"><span>Metronome on</span><input id="click-enabled" type="checkbox" ${metronome ? "checked" : ""}></label><label class="switch-row"><span>Accent the first beat</span><input id="click-accent" type="checkbox" ${clickAccent ? "checked" : ""}></label><label class="field"><span>Click volume</span><input id="click-volume" type="range" min="0" max="100" value="${Math.round(clickVolume * 100)}"></label></div>`,
    );
    $("#click-enabled").onchange = () => $("#metronome").click();
    $("#click-accent").onchange = (ev) => (clickAccent = ev.target.checked);
    $("#click-volume").oninput = (ev) => (clickVolume = +ev.target.value / 100);
  };
  $(".transport-right label span").innerHTML = icon("volume");
  // Modal option artwork is also drawn, never delegated to the emoji font.
  new MutationObserver(() =>
    $$(".option-icon").forEach((el) => {
      if (!el.querySelector("svg")) el.innerHTML = icon("score");
    }),
  ).observe($("#modal-body"), { childList: true, subtree: true });
  document.addEventListener("keydown", (ev) => {
    if (
      ev.key.toLowerCase() === "t" &&
      !ev.ctrlKey &&
      !ev.metaKey &&
      !ev.altKey &&
      !["INPUT", "SELECT", "TEXTAREA"].includes(
        document.activeElement?.tagName,
      ) &&
      !$("#modal").open
    ) {
      ev.preventDefault();
      tieSelected();
    }
  });
  window.addEventListener("resize", updateZoom);
  updateZoom();
}
