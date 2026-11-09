/* =====================================================================
   8-BIT AUDIO SYNTHESIZER & SEQUENCER (WebAudio)
   ===================================================================== */
export const Audio8 = (() => {
  let ac = null,
    master,
    mus,
    sfxG,
    noiseBuf,
    pw = {},
    muted = false,
    want = null,
    cur = null,
    timer = null;
  const NI = {
    C: 0,
    "C#": 1,
    D: 2,
    "D#": 3,
    E: 4,
    F: 5,
    "F#": 6,
    G: 7,
    "G#": 8,
    A: 9,
    "A#": 10,
    B: 11,
  };
  const midi = (n) => {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    return NI[m[1]] + (+m[2] + 1) * 12;
  };
  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function parse(str) {
    const t = str.trim().split(/\s+/),
      out = [];
    for (let i = 0; i < t.length; i++) {
      const tok = t[i];
      if (tok === "-" || tok === "_") {
        out.push(null);
        continue;
      }
      let d = 1;
      while (t[i + d] === "_") d++;
      out.push(/^[xX]$/.test(tok) ? { drum: tok } : { m: midi(tok), d });
    }
    return out;
  }
  function bass(roots, pat) {
    const P = {
      slow: [0, "_", "_", "_", 7, "_", "_", "_"],
      pulse: [0, "-", 7, "-", 12, "-", 7, "-"],
      drive: [0, 12, 0, 12, 0, 12, 7, 12],
    };
    const out = [];
    let last = -1;
    roots.forEach((r) => {
      const b = midi(r);
      P[pat].forEach((s) => {
        if (s === "_") {
          if (last >= 0) out[last].d++;
          out.push(null);
        } else if (s === "-") out.push(null);
        else {
          last = out.length;
          out.push({ m: b + s, d: 1 });
        }
      });
    });
    return out;
  }
  const TR = {
    camp: {
      bpm: 92,
      v: [
        {
          w: "p25",
          vol: 0.06,
          s: parse(
            "C5 _ E5 _ G5 _ E5 _ F5 _ A5 _ G5 _ _ _ E5 _ G5 _ C6 _ B5 _ A5 _ F5 _ G5 _ _ _",
          ),
        },
        { w: "triangle", vol: 0.2, s: bass(["C3", "F2", "C3", "G2"], "slow") },
      ],
    },
    field: {
      bpm: 126,
      v: [
        {
          w: "p25",
          vol: 0.06,
          s: parse(
            "E5 _ G5 _ C6 _ B5 A5 G5 _ E5 _ D5 _ E5 F5 G5 _ A5 _ G5 _ E5 C5 D5 _ _ _ - - - - E5 _ G5 _ C6 _ D6 C6 B5 _ G5 _ A5 _ B5 _ C6 _ B5 A5 G5 _ E5 _ C5 _ _ _ - - - -",
          ),
        },
        {
          w: "triangle",
          vol: 0.2,
          s: bass(["C3", "A2", "F2", "G2", "C3", "E2", "F2", "G2"], "pulse"),
        },
        { w: "noise", s: parse("x - - - x - - -") },
      ],
    },
    battle: {
      bpm: 158,
      v: [
        {
          w: "p25",
          vol: 0.06,
          s: parse(
            "A4 A4 C5 A4 E5 A4 D5 C5 B4 B4 D5 B4 E5 B4 D5 B4 C5 C5 E5 C5 A5 C5 G5 E5 F5 E5 D5 C5 B4 _ E5 _",
          ),
        },
        {
          w: "triangle",
          vol: 0.22,
          s: bass(["A2", "G2", "F2", "E2"], "drive"),
        },
        { w: "noise", s: parse("X - x - X x x -") },
      ],
    },
    boss: {
      bpm: 172,
      v: [
        {
          w: "p12",
          vol: 0.07,
          s: parse(
            "D5 _ D5 F5 A5 _ G5 F5 E5 _ C5 E5 G5 _ F5 E5 D5 _ D5 F5 A5 _ C6 A5 A#5 _ A5 G5 A5 _ _ _",
          ),
        },
        {
          w: "p25",
          vol: 0.03,
          s: parse(
            "A4 _ A4 D5 F5 _ E5 D5 C5 _ G4 C5 E5 _ D5 C5 A4 _ A4 D5 F5 _ A5 F5 F5 _ F5 E5 E5 _ _ _",
          ),
        },
        {
          w: "triangle",
          vol: 0.24,
          s: bass(["D2", "C2", "A#1", "A1"], "drive"),
        },
        { w: "noise", s: parse("X x x X x X x x") },
      ],
    },
    win: {
      bpm: 150,
      once: true,
      v: [
        { w: "p25", vol: 0.08, s: parse("C5 E5 G5 C6 _ G5 C6 _ _ _ - - - -") },
        { w: "triangle", vol: 0.2, s: parse("C3 _ _ _ G2 _ C3 _ _ _ - - - -") },
      ],
    },
    fail: {
      bpm: 96,
      once: true,
      v: [
        { w: "p25", vol: 0.07, s: parse("G4 F#4 F4 E4 _ _ _ - - -") },
        { w: "triangle", vol: 0.2, s: parse("C3 B2 A#2 A2 _ _ _ - - -") },
      ],
    },
  };
  function osc(type, f, t) {
    const o = ac.createOscillator();
    if (pw[type]) o.setPeriodicWave(pw[type]);
    else o.type = type;
    o.frequency.setValueAtTime(f, t);
    return o;
  }
  function note(type, m, t, dur, vol) {
    const o = osc(type, mf(m), t),
      g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol * 0.75, t + dur * 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(mus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function tone(type, f0, f1, dur, vol, delay = 0, dest = sfxG, at = null) {
    const t = at ?? ac.currentTime + delay,
      o = osc(type, f0, t),
      g = ac.createGain();
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function noise(
    dur,
    vol,
    freq,
    delay = 0,
    ftype = "bandpass",
    dest = sfxG,
    at = null,
  ) {
    const t = at ?? ac.currentTime + delay,
      src = ac.createBufferSource(),
      f = ac.createBiquadFilter(),
      g = ac.createGain();
    src.buffer = noiseBuf;
    f.type = ftype;
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  function drum(k, t) {
    if (k === "x") noise(0.04, 0.12, 7000, 0, "highpass", mus, t);
    else {
      noise(0.12, 0.22, 1600, 0, "bandpass", mus, t);
      tone("triangle", 150, 50, 0.12, 0.4, 0, mus, t);
    }
  }
  const S = {
    blip: () => tone("p25", 1200, null, 0.04, 0.1),
    select: () => {
      tone("p25", 880, null, 0.05, 0.12);
      tone("p25", 1320, null, 0.07, 0.12, 0.05);
    },
    back: () => tone("p25", 600, 380, 0.08, 0.1),
    hit: () => {
      noise(0.12, 0.35, 1800);
      tone("square", 220, 80, 0.1, 0.18);
    },
    crit: () => {
      noise(0.22, 0.45, 1100);
      tone("square", 440, 60, 0.2, 0.2);
      tone("p25", 1200, 1900, 0.1, 0.1, 0.06);
    },
    miss: () => tone("triangle", 900, 280, 0.16, 0.2),
    clang: () => {
      tone("square", 1900, 1500, 0.14, 0.1);
      tone("square", 2600, 2400, 0.1, 0.06);
      noise(0.06, 0.2, 5000);
    },
    hurt: () => {
      noise(0.18, 0.35, 900);
      tone("square", 160, 50, 0.2, 0.22);
    },
    heal: () =>
      [0, 4, 7, 12].forEach((s, i) =>
        tone("p25", mf(72 + s), null, 0.09, 0.1, i * 0.06),
      ),
    item: () => {
      tone("p25", 660, null, 0.06, 0.1);
      tone("p25", 990, null, 0.08, 0.1, 0.06);
    },
    sharpen: () => {
      noise(0.08, 0.25, 6000, 0, "highpass");
      noise(0.08, 0.25, 6500, 0.12, "highpass");
      tone("p25", 1600, 2400, 0.1, 0.07, 0.24);
    },
    charge: () => tone("square", 180, 900, 0.4, 0.1),
    trap: () => {
      for (let i = 0; i < 7; i++)
        tone("square", 1400 + Math.random() * 900, 220, 0.05, 0.08, i * 0.05);
    },
    tranq: () => noise(0.6, 0.25, 600, 0, "lowpass"),
    flash: () => {
      noise(0.3, 0.35, 4000, 0, "highpass");
      tone("p25", 2000, 3200, 0.25, 0.08);
    },
    roar: () => {
      noise(0.9, 0.5, 380, 0, "lowpass");
      tone("sawtooth", 130, 55, 0.9, 0.18);
    },
    swoosh: () => noise(0.16, 0.22, 1400),
    bang: () => {
      tone("p25", 1400, null, 0.05, 0.12);
      tone("p25", 1400, null, 0.06, 0.12, 0.08);
    },
    area: () => noise(0.25, 0.14, 700),
    encounter: () => {
      for (let i = 0; i < 10; i++)
        tone("p25", mf(64 + (i % 2 ? 7 : 0) + i), null, 0.05, 0.1, i * 0.05);
    },
    gather: () =>
      [0, 7, 12].forEach((s, i) =>
        tone("p25", mf(76 + s), null, 0.07, 0.09, i * 0.06),
      ),
    carve: () => {
      noise(0.1, 0.3, 3000);
      tone("square", 320, 140, 0.12, 0.14);
    },
    breakp: () => {
      noise(0.35, 0.45, 900);
      tone("square", 600, 90, 0.3, 0.16);
    },
    faint: () => tone("triangle", 620, 55, 0.9, 0.25),
    buy: () => {
      tone("p25", 988, null, 0.06, 0.1);
      tone("p25", 1319, null, 0.14, 0.1, 0.06);
    },
    capture: () =>
      [0, 4, 7, 4, 7, 12].forEach((s, i) =>
        tone("p25", mf(67 + s), null, 0.1, 0.1, i * 0.08),
      ),
  };
  function stopTrack() {
    if (timer) clearInterval(timer);
    timer = null;
    cur = null;
  }
  function startTrack(name) {
    stopTrack();
    const T = TR[name],
      len = Math.max(...T.v.map((v) => v.s.length));
    cur = {
      name,
      T,
      len,
      step: 0,
      t: ac.currentTime + 0.06,
      dur: 60 / T.bpm / 2,
    };
    timer = setInterval(tick, 25);
  }
  function tick() {
    while (cur && cur.t < ac.currentTime + 0.15) {
      for (const v of cur.T.v) {
        if (cur.T.once && cur.step >= v.s.length) continue;
        const ev = v.s[cur.step % v.s.length];
        if (!ev) continue;
        if (ev.drum) drum(ev.drum, cur.t);
        else note(v.w, ev.m, cur.t, ev.d * cur.dur * 0.92, v.vol);
      }
      cur.step++;
      cur.t += cur.dur;
      if (cur.T.once && cur.step >= cur.len) {
        stopTrack();
        want = null;
      }
    }
  }
  function pulse(duty) {
    const n = 48,
      re = new Float32Array(n),
      im = new Float32Array(n);
    for (let k = 1; k < n; k++)
      re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  }
  return {
    init() {
      if (ac) {
        if (ac.state === "suspended") ac.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ac.destination);
      mus = ac.createGain();
      mus.gain.value = 0.55;
      mus.connect(master);
      sfxG = ac.createGain();
      sfxG.gain.value = 0.7;
      sfxG.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      pw.p25 = pulse(0.25);
      pw.p12 = pulse(0.125);
      if (want) startTrack(want);
    },
    sfx(n) {
      if (ac && !muted && S[n])
        try {
          S[n]();
        } catch (e) {}
    },
    music(n) {
      want = n;
      if (!ac) return;
      if (cur && cur.name === n) return;
      startTrack(n);
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    get muted() {
      return muted;
    },
  };
})();
