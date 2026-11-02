/* 8-bit audio with WebAudio: pulse, triangle and noise channels. No audio files.
   Music is an 8th-note step sequencer. Note tokens: "C5", "_" = hold, "-" = rest.
   Drums: "x" = hi-hat, "X" = snare + kick. */
import { G } from '../core/state.js';
import { VILLAGE } from '../data/world.js';

export const Audio8 = (() => {
  let ac = null, master, mus, sfxG, noiseBuf, pw = {}, muted = false, want = null, cur = null, timer = null;
  const NI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const midi = n => { const m = /^([A-G]#?)(\d)$/.exec(n); return NI[m[1]] + (+m[2] + 1) * 12; };
  const mf = m => 440 * Math.pow(2, (m - 69) / 12);

  function parse(str) {
    const t = str.trim().split(/\s+/), out = [];
    for (let i = 0; i < t.length; i++) {
      const tok = t[i];
      if (tok === '-' || tok === '_') { out.push(null); continue; }
      let d = 1; while (t[i + d] === '_') d++;
      out.push(/^[xX]$/.test(tok) ? { drum: tok } : { m: midi(tok), d });
    }
    return out;
  }
  // Generates a bass line from chord roots and a pattern (semitone offsets)
  function bass(roots, pat) {
    const P = { slow: [0, '_', '_', '_', 7, '_', '_', '_'], pulse: [0, '-', 7, '-', 12, '-', 7, '-'], drive: [0, 12, 0, 12, 0, 12, 7, 12] };
    const out = []; let last = -1;
    roots.forEach(r => { const b = midi(r); P[pat].forEach(s => {
      if (s === '_') { if (last >= 0) out[last].d++; out.push(null); }
      else if (s === '-') out.push(null);
      else { last = out.length; out.push({ m: b + s, d: 1 }); }
    }); });
    return out;
  }

  const TR = {
    camp:  { bpm: 92, v: [
      { w: 'p25', vol: .06, s: parse('C5 _ E5 _ G5 _ E5 _ F5 _ A5 _ G5 _ _ _ E5 _ G5 _ C6 _ B5 _ A5 _ F5 _ G5 _ _ _') },
      { w: 'triangle', vol: .2, s: bass(['C3', 'F2', 'C3', 'G2'], 'slow') }] },
    field: { bpm: 126, v: [
      { w: 'p25', vol: .06, s: parse('E5 _ G5 _ C6 _ B5 A5 G5 _ E5 _ D5 _ E5 F5 G5 _ A5 _ G5 _ E5 C5 D5 _ _ _ - - - - ' +
                                     'E5 _ G5 _ C6 _ D6 C6 B5 _ G5 _ A5 _ B5 _ C6 _ B5 A5 G5 _ E5 _ C5 _ _ _ - - - -') },
      { w: 'triangle', vol: .2, s: bass(['C3', 'A2', 'F2', 'G2', 'C3', 'E2', 'F2', 'G2'], 'pulse') },
      { w: 'noise', s: parse('x - - - x - - -') }] },
    battle:{ bpm: 158, v: [
      { w: 'p25', vol: .06, s: parse('A4 A4 C5 A4 E5 A4 D5 C5 B4 B4 D5 B4 E5 B4 D5 B4 C5 C5 E5 C5 A5 C5 G5 E5 F5 E5 D5 C5 B4 _ E5 _') },
      { w: 'triangle', vol: .22, s: bass(['A2', 'G2', 'F2', 'E2'], 'drive') },
      { w: 'noise', s: parse('X - x - X x x -') }] },
    boss:  { bpm: 172, v: [
      { w: 'p12', vol: .07, s: parse('D5 _ D5 F5 A5 _ G5 F5 E5 _ C5 E5 G5 _ F5 E5 D5 _ D5 F5 A5 _ C6 A5 A#5 _ A5 G5 A5 _ _ _') },
      { w: 'p25', vol: .03, s: parse('A4 _ A4 D5 F5 _ E5 D5 C5 _ G4 C5 E5 _ D5 C5 A4 _ A4 D5 F5 _ A5 F5 F5 _ F5 E5 E5 _ _ _') },
      { w: 'triangle', vol: .24, s: bass(['D2', 'C2', 'A#1', 'A1'], 'drive') },
      { w: 'noise', s: parse('X x x X x X x x') }] },
    win:   { bpm: 150, once: true, v: [
      { w: 'p25', vol: .08, s: parse('C5 E5 G5 C6 _ G5 C6 _ _ _ - - - -') },
      { w: 'triangle', vol: .2, s: parse('C3 _ _ _ G2 _ C3 _ _ _ - - - -') }] },
    fail:  { bpm: 96, once: true, v: [
      { w: 'p25', vol: .07, s: parse('G4 F#4 F4 E4 _ _ _ - - -') },
      { w: 'triangle', vol: .2, s: parse('C3 B2 A#2 A2 _ _ _ - - -') }] },
    village: { bpm: 100, v: [
      { w: 'p25', vol: .06, s: parse('G5 _ E5 _ D5 _ C5 _ D5 _ E5 _ G5 _ _ _ A5 _ G5 _ E5 _ D5 _ C5 _ D5 _ _ _ - -') },
      { w: 'triangle', vol: .2, s: bass(['C3', 'A2', 'F2', 'G2'], 'slow') },
      { w: 'noise', s: parse('x - - - - - - -') }] },
  };

  function osc(type, f, t) {
    const o = ac.createOscillator();
    if (pw[type]) o.setPeriodicWave(pw[type]); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    return o;
  }
  function note(type, m, t, dur, vol) {
    const o = osc(type, mf(m), t), g = ac.createGain();
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .008);
    g.gain.setValueAtTime(vol * .75, t + dur * .5); g.gain.linearRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(mus); o.start(t); o.stop(t + dur + .02);
  }
  function tone(type, f0, f1, dur, vol, delay = 0, dest = sfxG, at = null) {
    const t = at ?? ac.currentTime + delay, o = osc(type, f0, t), g = ac.createGain();
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, vol, freq, delay = 0, ftype = 'bandpass', dest = sfxG, at = null) {
    const t = at ?? ac.currentTime + delay, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t); src.stop(t + dur + .02);
  }
  function drum(k, t) {
    if (k === 'x') noise(.04, .12, 7000, 0, 'highpass', mus, t);
    else { noise(.12, .22, 1600, 0, 'bandpass', mus, t); tone('triangle', 150, 50, .12, .4, 0, mus, t); }
  }

  const S = {
    blip:   () => tone('p25', 1200, null, .04, .1),
    select: () => { tone('p25', 880, null, .05, .12); tone('p25', 1320, null, .07, .12, .05); },
    back:   () => tone('p25', 600, 380, .08, .1),
    hit:    () => { noise(.12, .35, 1800); tone('square', 220, 80, .1, .18); },
    crit:   () => { noise(.22, .45, 1100); tone('square', 440, 60, .2, .2); tone('p25', 1200, 1900, .1, .1, .06); },
    miss:   () => tone('triangle', 900, 280, .16, .2),
    clang:  () => { tone('square', 1900, 1500, .14, .1); tone('square', 2600, 2400, .1, .06); noise(.06, .2, 5000); },
    hurt:   () => { noise(.18, .35, 900); tone('square', 160, 50, .2, .22); },
    heal:   () => [0, 4, 7, 12].forEach((s, i) => tone('p25', mf(72 + s), null, .09, .1, i * .06)),
    item:   () => { tone('p25', 660, null, .06, .1); tone('p25', 990, null, .08, .1, .06); },
    sharpen:() => { noise(.08, .25, 6000, 0, 'highpass'); noise(.08, .25, 6500, .12, 'highpass'); tone('p25', 1600, 2400, .1, .07, .24); },
    charge: () => tone('square', 180, 900, .4, .1),
    trap:   () => { for (let i = 0; i < 7; i++) tone('square', 1400 + Math.random() * 900, 220, .05, .08, i * .05); },
    tranq:  () => noise(.6, .25, 600, 0, 'lowpass'),
    flash:  () => { noise(.3, .35, 4000, 0, 'highpass'); tone('p25', 2000, 3200, .25, .08); },
    roar:   () => { noise(.9, .5, 380, 0, 'lowpass'); tone('sawtooth', 130, 55, .9, .18); },
    swoosh: () => noise(.16, .22, 1400),
    bang:   () => { tone('p25', 1400, null, .05, .12); tone('p25', 1400, null, .06, .12, .08); },
    area:   () => noise(.25, .14, 700),
    encounter: () => { for (let i = 0; i < 10; i++) tone('p25', mf(64 + (i % 2 ? 7 : 0) + i), null, .05, .1, i * .05); },
    gather: () => [0, 7, 12].forEach((s, i) => tone('p25', mf(76 + s), null, .07, .09, i * .06)),
    carve:  () => { noise(.1, .3, 3000); tone('square', 320, 140, .12, .14); },
    breakp: () => { noise(.35, .45, 900); tone('square', 600, 90, .3, .16); },
    faint:  () => tone('triangle', 620, 55, .9, .25),
    buy:    () => { tone('p25', 988, null, .06, .1); tone('p25', 1319, null, .14, .1, .06); },
    capture:() => [0, 4, 7, 4, 7, 12].forEach((s, i) => tone('p25', mf(67 + s), null, .1, .1, i * .08))
  };

  function stopTrack() { if (timer) clearInterval(timer); timer = null; cur = null; }
  function startTrack(name) {
    stopTrack();
    const T = TR[name], len = Math.max(...T.v.map(v => v.s.length));
    cur = { name, T, len, step: 0, t: ac.currentTime + .06, dur: 60 / T.bpm / 2 };
    timer = setInterval(tick, 25);
  }
  // Look-ahead scheduler: queues notes ~150 ms ahead of the audio clock
  function tick() {
    while (cur && cur.t < ac.currentTime + .15) {
      for (const v of cur.T.v) {
        if (cur.T.once && cur.step >= v.s.length) continue;
        const ev = v.s[cur.step % v.s.length];
        if (!ev) continue;
        if (ev.drum) drum(ev.drum, cur.t); else note(v.w, ev.m, cur.t, ev.d * cur.dur * .92, v.vol);
      }
      cur.step++; cur.t += cur.dur;
      if (cur.T.once && cur.step >= cur.len) { stopTrack(); want = null; }
    }
  }
  function pulse(duty) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = 2 / (k * Math.PI) * Math.sin(k * Math.PI * duty);
    return ac.createPeriodicWave(re, im);
  }

  return {
    /** Must run inside a user gesture (browser autoplay rules). Safe to call repeatedly. */
    init() {
      if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : .5; master.connect(ac.destination);
      mus = ac.createGain(); mus.gain.value = .55; mus.connect(master);
      sfxG = ac.createGain(); sfxG.gain.value = .7; sfxG.connect(master);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const ch = noiseBuf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      pw.p25 = pulse(.25); pw.p12 = pulse(.125);
      if (want) startTrack(want);
    },
    sfx(n) { if (ac && !muted && S[n]) try { S[n](); } catch (e) { /* ignore */ } },
    music(n) { want = n; if (!ac) return; if (cur && cur.name === n) return; startTrack(n); },
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : .5; },
    get muted() { return muted; }
  };
})();

/** Camp gets its own calm theme; every other area plays the field theme. */
export const fieldMusic = () => !G || G.f.area === VILLAGE ? 'village' : G.f.area === 0 ? 'camp' : 'field';