const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM, ResourceLoader, VirtualConsole } = require("jsdom");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const html = read("index.html").replace(/<script[^>]*><\/script>/g, "");
const dom = new JSDOM(html, {
  runScripts: "outside-only",
  url: "https://atelier.test/",
  pretendToBeVisual: true,
});
const w = dom.window;
w.HTMLCanvasElement.prototype.getContext = function () {
  return {
    font: "10px Arial",
    measureText(t) {
      const size = parseFloat(this.font) || 10;
      return {
        width: String(t).length * size * 0.55,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: String(t).length * size * 0.55,
        actualBoundingBoxAscent: size * 0.8,
        actualBoundingBoxDescent: size * 0.2,
        fontBoundingBoxAscent: size * 0.8,
        fontBoundingBoxDescent: size * 0.2,
      };
    },
  };
};
w.HTMLElement.prototype.scrollIntoView = function () {};
w.HTMLElement.prototype.scrollTo = function () {};
w.HTMLDialogElement.prototype.showModal = function () {
  this.open = true;
};
w.HTMLDialogElement.prototype.close = function () {
  this.open = false;
};
w.SVGElement.prototype.getBBox = function () {
  const size = parseFloat(this.getAttribute("font-size")) || 12;
  return {
    x: 0,
    y: 0,
    width: this.textContent.length * size * 0.55,
    height: size,
  };
};
w.eval(read("vexflow.js"));
w.eval(
  read("studio.js") +
    "\n" +
    read("app.js") +
    "\nwindow.testEval = s => eval(s);",
);
const ev = (s) => w.testEval(s);
const q = (s) => w.document.querySelector(s);
const change = (selector, value) => {
  const el = q(selector);
  if (el.type === "checkbox") el.checked = value;
  else el.value = value;
  el.dispatchEvent(new w.Event("change"));
};
function reset(body = "project = demo()") {
  ev(
    `stopPlayback(); defaultLetRing = true; ${body}; selection = {bar:0,event:0,string:1}; selectedStrings = new Set([1]); panel = "note"; undoStack=[]; redoStack=[]; normalizeTies(); render();`,
  );
}
after(() => dom.window.close());

test("deferred scripts load as separate files without global-scope errors", async () => {
  const errors = [];
  class LocalAssets extends ResourceLoader {
    fetch(url) {
      const parsed = new URL(url);
      if (parsed.hostname !== "atelier.test") return null;
      return Promise.resolve(fs.readFileSync(path.join(root, parsed.pathname)));
    }
  }
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (err) => errors.push(err.message));
  const page = new JSDOM(read("index.html"), {
    url: "https://atelier.test/",
    runScripts: "dangerously",
    resources: new LocalAssets(),
    virtualConsole,
    beforeParse(win) {
      win.TextEncoder = TextEncoder;
      win.TextDecoder = TextDecoder;
      win.HTMLCanvasElement.prototype.getContext =
        w.HTMLCanvasElement.prototype.getContext;
      win.SVGElement.prototype.getBBox = w.SVGElement.prototype.getBBox;
    },
  });
  try {
    await new Promise((resolve) =>
      page.window.addEventListener("load", resolve),
    );
    assert.deepEqual(errors, []);
    assert.equal(
      page.window.document.querySelectorAll("#durations svg").length,
      7,
    );
    assert.equal(
      page.window.document.querySelectorAll(".score-system").length,
      3,
    );
  } finally {
    page.window.close();
  }
});

test("demo and all seven vector duration icons render", () => {
  reset();
  assert.equal(ev("renderErrors.length"), 0);
  assert.equal(
    w.document.querySelectorAll("#durations .duration-icon").length,
    7,
  );
  assert.equal(
    ev("project.bars.every((b,i)=>Math.abs(used(b)-capacity(i))<.00001)"),
    true,
  );
  assert.equal(q("#import-file").hasAttribute("accept"), false);
});

test("multi-string ties fill only empty strings, replace rest, and leave TAB continuation blank", () => {
  reset(
    "project=demo(); project.bars=[bar({events:[event([note(1,7),note(2,5),note(6,0)],4),event([note(2,3)],8),event([],8)]})]",
  );
  ev("setSelection(0,1,1); selectedStrings=new Set([1,2,6]); tieSelected()");
  assert.equal(ev("currentEvent().notes.length"), 3);
  assert.equal(ev("currentEvent().notes.find(n=>n.string===2).fret"), 3);
  assert.equal(ev("currentEvent().notes.filter(n=>n.tie).length"), 2);
  assert.equal(
    ev('locations[1].tn.getPositions().filter(n=>n.fret==="").length'),
    2,
  );
  assert.equal(ev("locations[1].sn._atelierNotes.length"), 3);
  assert.ok(q(".vf-stavetie"));
  ev("setSelection(0,2,1); selectedStrings=new Set([1,6]); tieSelected()");
  assert.equal(ev("currentEvent().notes.every(n=>n.tie)"), true);
  assert.equal(ev("renderErrors.length"), 0);
  const before = ev("JSON.stringify(currentEvent())");
  ev("tieSelected()");
  assert.equal(ev("JSON.stringify(currentEvent())"), before);
});

test("ties chain across full measures and systems, survive import and undo/redo", () => {
  reset(
    "project=demo();project.bars=[bar({events:[event([note(1,12)],1)]}),bar({events:[event([],1)]}),bar({events:[event([],1)]})]",
  );
  ev("setSelection(1,0,1);tieSelected();setSelection(2,0,1);tieSelected()");
  assert.equal(ev("renderErrors.length"), 0);
  assert.equal(ev("currentNote().tie"), true);
  ev("project=validateProject(clone(project));normalizeTies();render()");
  assert.equal(ev("currentNote().tie"), true);
  ev("history(false)");
  assert.equal(ev("currentEvent().notes.length"), 0);
  ev("history(true)");
  assert.equal(ev("currentNote().tie"), true);
  assert.ok(w.document.querySelectorAll(".vf-stavetie").length >= 3);
  ev("setSelection(0,0,1);setFret(1,9)");
  assert.equal(ev("project.bars[2].events[0].notes[0].fret"), 9);
  ev('setFret(1,"")');
  assert.equal(ev("project.bars[2].events[0].notes.length"), 0);
});

test("ties cannot jump unfilled measures or sustain dead notes", () => {
  reset(
    "project=demo();project.bars=[bar({events:[event([note(1,7)],4)]}),bar({events:[event([],4)]})]",
  );
  ev("setSelection(1,0,1);tieSelected()");
  assert.equal(ev("currentEvent().notes.length"), 0);
  reset(
    'project=demo();project.bars=[bar({events:[event([note(1,"x")]),event([])]})]',
  );
  ev("setSelection(0,1,1);tieSelected()");
  assert.equal(ev("currentEvent().notes.length"), 0);
});

test("tie playback has one attack, adds exact durations and follows tempo changes", () => {
  reset(
    "project=demo();project.tempo=60;project.bars=[bar({meter:[1,4],events:[event([note(1,7,{sustain:false})],4)]}),bar({tempo:120,events:[event([],4)]})]",
  );
  ev(
    "setSelection(1,0,1);tieSelected(); timeline=buildTimeline().events; playEnd=buildTimeline().duration;audioStart=0;window.calls=[];window.originalPluck=pluck;pluck=(...args)=>window.calls.push(args);timeline.forEach(scheduleEvent);pluck=window.originalPluck",
  );
  assert.equal(w.calls.length, 1);
  assert.equal(w.calls[0][2], 1.5);
  assert.equal(
    ev("soundingDuration(buildTimeline(1,0).events,0,currentNote(),.5)"),
    0.5,
  );
});

test("batch effects change only selected existing notes, new let-ring defaults and dynamics", () => {
  reset(
    "project=demo();project.bars=[bar({events:[event([note(1,12),note(2,12),note(6,0)])]})]",
  );
  ev("selectedStrings=new Set([1,2,3]);renderInspector()");
  q('[data-tech="NA"]').click();
  assert.equal(
    ev('currentEvent().notes.filter(n=>n.tech.includes("NA")).length'),
    2,
  );
  assert.equal(ev("currentEvent().notes.length"), 3);
  change("#harmonic", "natural");
  assert.equal(
    ev("currentEvent().notes.filter(n=>n.harmonic && n.velocity===127).length"),
    2,
  );
  assert.equal(ev("currentEvent().notes.find(n=>n.string===6).velocity"), 20);
  change("#velocity", "195");
  assert.equal(ev("currentEvent().notes[0].velocity"), 195);
  change("#sustain", false);
  assert.equal(ev("currentEvent().notes[0].sustain"), false);
  assert.equal(ev("currentEvent().notes[2].sustain"), true);
  change("#default-let-ring", false);
  assert.equal(ev("note(1,0).sustain"), false);
  ev("history(false)");
  assert.equal(ev("note(1,0).sustain"), true);
  assert.equal(
    ev("validateProject(clone(project)).bars[0].events[0].notes[0].velocity"),
    195,
  );
});

test("fret +/- supports bounds and turns a tied continuation into an attack", () => {
  reset(
    "project=demo();project.bars=[bar({events:[event([note(1,24)]),event([])]})]",
  );
  q('[aria-label="Raise fret on string 1"]').click();
  assert.equal(ev("currentNote().fret"), 24);
  q('[aria-label="Lower fret on string 1"]').click();
  assert.equal(ev("currentNote().fret"), 23);
  ev("setSelection(0,1,1);tieSelected()");
  q('[aria-label="Lower fret on string 1"]').click();
  assert.equal(ev("currentNote().fret"), 22);
  assert.equal(ev("!!currentNote().tie"), false);
});

test("natural bass under bowed strings sustains independently, grace remains softer", () => {
  reset();
  ev(
    "setSelection(4,0,6);currentNote().grace=3;timeline=buildTimeline(4,0).events;playEnd=buildTimeline(4,0).duration;audioStart=0;window.calls=[];window.originalPluck=pluck;pluck=(...args)=>window.calls.push(args);scheduleEvent(timeline[0],0);pluck=window.originalPluck",
  );
  const bass = w.calls.filter((c) => c[4] === "steel");
  const bow = w.calls.filter((c) => c[4] === "bow");
  assert.equal(bass.length, 2);
  assert.equal(bow.length, 2);
  assert.equal(bass[0][3], bass[1][3] * 0.25);
  assert.ok(bass[1][2] > ev("timeline[0].duration"));
});

test("harmonics use the original plucked buffer, normal sustain and the 200 ceiling", () => {
  reset();
  const buffers = [],
    sources = [];
  const parameter = () => ({
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  const mock = {
    sampleRate: 22050,
    createBuffer(channels, size) {
      const data = new Float32Array(size);
      buffers.push(data);
      return { getChannelData: () => data };
    },
    createBufferSource() {
      const source = {
        connect() {},
        start() {},
        stop() {},
        playbackRate: parameter(),
      };
      sources.push(source);
      return source;
    },
    createGain: () => ({ connect() {}, gain: parameter() }),
    createBiquadFilter: () => ({ connect() {}, frequency: parameter() }),
    createOscillator() {
      throw Error("Harmonics must not use the added oscillator sound");
    },
  };
  w.mockAudio = mock;
  ev("window.savedAudio=audioCtx; audioCtx=window.mockAudio; voiceBus={};");
  try {
    for (const harmonic of ["natural", "artificial", "pinch", "tapped"]) {
      ev(
        `pluck(76, 0, 3, 127, "steel", {harmonic:"${harmonic}",fret:12,tech:[],sustain:true})`,
      );
    }
    assert.equal(sources.length, 4);
    assert.ok(buffers[0].some((value) => value !== 0));
    const rms = (start) => {
      const a = buffers[0].slice(start * 22050, (start + 0.1) * 22050);
      return Math.sqrt(a.reduce((sum, n) => sum + n * n, 0) / a.length);
    };
    assert.ok(
      rms(2) < rms(0) * 0.2,
      "original plucked decay, no held synth envelope",
    );
  } finally {
    ev("audioCtx=window.savedAudio;voiceBus=null;audioNodes=[];");
  }
  reset(
    'project=demo();project.bars=[bar({events:[event([note(1,12,{harmonic:"natural"})],4)]})]',
  );
  assert.equal(ev("currentNote().velocity"), 127);
  assert.equal(q("#velocity").max, "200");
  assert.equal(
    ev(
      "soundingDuration(buildTimeline().events,0,currentNote(),buildTimeline().duration)",
    ),
    ev(
      'soundingDuration(buildTimeline().events,0,{...currentNote(),harmonic:""},buildTimeline().duration)',
    ),
  );
  ev('currentNote().tech=["ST"]');
  assert.ok(
    ev(
      "soundingDuration(buildTimeline().events,0,currentNote(),buildTimeline().duration)<=.16",
    ),
  );
  ev("currentNote().velocity=275");
  assert.equal(
    ev("validateProject(clone(project)).bars[0].events[0].notes[0].velocity"),
    200,
  );
});

test("metronome follows compound and changing meters, accent and count controls work", () => {
  reset(
    "project=demo();project.tempo=120;project.bars=[bar({meter:[6,8],events:[event([],2,{dots:1})]}),bar({meter:[3,4],tempo:60,events:[event([],2,{dots:1})]})]",
  );
  const clicks = JSON.parse(ev("JSON.stringify(buildTimeline().clicks)"));
  assert.equal(clicks.length, 9);
  assert.equal(clicks.filter((c) => c.accent).length, 2);
  assert.equal(clicks[1].time, 0.25);
  assert.equal(clicks[6].time, 1.5);
  assert.equal(clicks[7].time, 2.5);
  q("#click-settings").click();
  change("#click-accent", false);
  assert.equal(ev("clickAccent"), false);
  change("#click-enabled", true);
  assert.equal(ev("metronome"), true);
  ev("closeModal()");
});

test("copy/paste remaps internal ties and MusicXML exports ties and legato slides", () => {
  reset(
    'project=demo();project.bars=[bar({events:[event([note(1,3)],4),event([],4),event([note(1,5,{tech:["LS"]})],4),event([note(1,9)],4)]})]',
  );
  ev(
    "setSelection(0,1,1);tieSelected();clipboard={bars:clone(project.bars)};pasteBars()",
  );
  assert.equal(
    ev(
      "project.bars[1].events[1].notes[0].tieFrom===project.bars[1].events[0].id",
    ),
    true,
  );
  const xml = ev("musicXML()");
  const doc = new w.DOMParser().parseFromString(xml, "text/xml");
  assert.equal(doc.querySelector("parsererror"), null);
  assert.equal(doc.querySelectorAll('tie[type="start"]').length, 2);
  assert.equal(doc.querySelectorAll('tied[type="stop"]').length, 2);
  assert.equal(doc.querySelectorAll('slide[type="start"]').length, 2);
  assert.equal(doc.querySelectorAll('slur[type="start"]').length, 2);
  assert.ok(w.document.querySelectorAll(".technique-connection").length >= 4);
});

test("zoom uses one page width and responsive SVGs, never CSS zoom", () => {
  reset();
  q("#zoom-in").click();
  assert.equal(q("#paper").style.width, "726px");
  assert.equal(q("#paper").style.zoom, undefined);
  assert.equal(q(".score-system svg").style.width, "100%");
});

test("PDF export contains vector notation including ties", async () => {
  reset(
    'project=demo();project.bars=[bar({events:[event([note(1,12,{harmonic:"natural"}),note(6,0)],2),event([],2)]})]',
  );
  ev("setSelection(0,1,1);selectedStrings=new Set([1,6]);tieSelected()");
  w.SVGElement.prototype.getComputedTextLength = function () {
    return this.getBBox().width;
  };
  w.SVGElement.prototype.getScreenCTM = function () {
    return {
      a: 1,
      b: 0,
      c: 0,
      d: 1,
      e: 0,
      f: 0,
      inverse() {
        return this;
      },
    };
  };
  w.fetch = async (file) => ({
    ok: true,
    arrayBuffer: async () =>
      Uint8Array.from(fs.readFileSync(path.join(root, file))).buffer,
  });
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.eval(read("jspdf.umd.min.js"));
  w.eval(read("svg2pdf.umd.min.js"));
  let bytes;
  w.jspdf.jsPDF.API.save = function () {
    bytes = Buffer.from(this.output("arraybuffer"));
  };
  await ev("exportPDF()");
  assert.equal(q("#toast").textContent, "PDF downloaded.");
  assert.ok(bytes.length > 10000);
  assert.equal(bytes.subarray(0, 4).toString(), "%PDF");
  if (process.env.ATELIER_TEST_PDF)
    fs.writeFileSync(process.env.ATELIER_TEST_PDF, bytes);
});
