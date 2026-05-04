const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const hint = document.getElementById('hint');

let W, H;
function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resize();


// ── Audio ──────────────────────────────────────────────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playLaunch() {
  const t = audioCtx.currentTime;
  // 嗖声：白噪声 + 高通滤波，音调快速上扫
  const bufSize = audioCtx.sampleRate * 0.5;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(3000, t + 0.45);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.06, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
  src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
  src.start(t); src.stop(t + 0.45);
}

function playBoom() {
  const t = audioCtx.currentTime;
  // 砰：低频噪声冲击，快速衰减
  const bufSize = audioCtx.sampleRate * 0.8;
  const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource();
  src.buffer = buf;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, t);
  filter.frequency.exponentialRampToValueAtTime(60, t + 0.5);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.9, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  src.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
  src.start(t); src.stop(t + 0.8);
  // 余震：更低频的隆隆声
  const buf2 = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const d2 = buf2.getChannelData(0);
  for (let i = 0; i < bufSize; i++) d2[i] = Math.random() * 2 - 1;
  const src2 = audioCtx.createBufferSource();
  src2.buffer = buf2;
  const f2 = audioCtx.createBiquadFilter();
  f2.type = 'lowpass'; f2.frequency.value = 120;
  const g2 = audioCtx.createGain();
  g2.gain.setValueAtTime(0.3, t + 0.05);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
  src2.connect(f2); f2.connect(g2); g2.connect(audioCtx.destination);
  src2.start(t + 0.05); src2.stop(t + 0.8);
}

// ── Background music (ambient romantic) ───────────────────
let musicStarted = false;

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;

  // Reverb impulse
  const convolver = audioCtx.createConvolver();
  const irLen = audioCtx.sampleRate * 2.5;
  const ir = audioCtx.createBuffer(2, irLen, audioCtx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 2);
  }
  convolver.buffer = ir;

  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.18;
  convolver.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  // Pentatonic melody notes (Hz) — romantic, gentle
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25];

  function playNote(freq, startTime, dur) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(0.4, startTime + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    osc.connect(g); g.connect(convolver);
    osc.start(startTime); osc.stop(startTime + dur + 0.1);
  }

  // Gentle pad chord (low, sustained)
  function playPad(freq, startTime) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq / 2;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(0.15, startTime + 1.5);
    g.gain.linearRampToValueAtTime(0, startTime + 6);
    osc.connect(g); g.connect(convolver);
    osc.start(startTime); osc.stop(startTime + 6.5);
  }

  function schedulePhrase(t) {
    // random gentle melody
    const melody = [0,2,4,5,4,2,1,0,2,4,7,6,4,2,0];
    let offset = 0;
    for (const idx of melody) {
      const freq = scale[idx % scale.length];
      const dur = 0.6 + Math.random() * 0.8;
      playNote(freq, t + offset, dur + 0.4);
      offset += dur * 0.7;
    }
    // pad chords underneath
    playPad(scale[0], t);
    playPad(scale[2], t + 0.1);
    playPad(scale[4], t + 0.2);
    // schedule next phrase
    setTimeout(() => schedulePhrase(audioCtx.currentTime), (offset - 1) * 1000);
  }

  schedulePhrase(audioCtx.currentTime + 0.1);
}



// ── Waves ──────────────────────────────────────────────────
let waveTime = 0;

function drawBackground() {
  waveTime += 0.008;

  // sky gradient — deep navy to near-black
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#010208');
  sky.addColorStop(0.45, '#050d1f');
  sky.addColorStop(0.72, '#071428');
  sky.addColorStop(1, '#020810');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // milky way band — diagonal glow
  const mw = ctx.createLinearGradient(W * 0.2, 0, W * 0.65, H * 0.7);
  mw.addColorStop(0, 'rgba(80,100,180,0)');
  mw.addColorStop(0.3, 'rgba(100,120,200,0.07)');
  mw.addColorStop(0.5, 'rgba(140,160,220,0.11)');
  mw.addColorStop(0.7, 'rgba(100,120,200,0.07)');
  mw.addColorStop(1, 'rgba(80,100,180,0)');
  ctx.fillStyle = mw;
  ctx.fillRect(0, 0, W, H);

  const shore = H * 0.65;

  // ocean base — brighter blue
  const sea = ctx.createLinearGradient(0, shore, 0, H);
  sea.addColorStop(0,   '#0a2a50');
  sea.addColorStop(0.4, '#071e3d');
  sea.addColorStop(1,   '#030d1e');
  ctx.fillStyle = sea;
  ctx.fillRect(0, shore, W, H - shore);

  // moonlight column reflection
  const refl = ctx.createLinearGradient(W*0.4, shore, W*0.6, H);
  refl.addColorStop(0, 'rgba(160,200,255,0.12)');
  refl.addColorStop(1, 'rgba(160,200,255,0)');
  ctx.fillStyle = refl;
  ctx.fillRect(W*0.3, shore, W*0.4, H - shore);

  function smoothWave(baseY, amp1, amp2, freq1, freq2, spd1, spd2) {
    ctx.moveTo(0, baseY + amp1 * Math.sin(waveTime * spd1) + amp2 * Math.sin(-waveTime * spd2));
    for (let x = 1; x <= W; x += 2) {
      ctx.lineTo(x, baseY
        + amp1 * Math.sin(x * freq1 + waveTime * spd1)
        + amp2 * Math.sin(x * freq2 - waveTime * spd2));
    }
  }

  const waves = [
    { yBase:0.68, amp1:3,  amp2:2,  freq1:0.018, freq2:0.031, spd1:0.8,  spd2:1.3,  fill:'rgba(15,55,110,0.55)',  foam:'rgba(100,170,255,0.5)', fw:1.2 },
    { yBase:0.75, amp1:4,  amp2:2,  freq1:0.015, freq2:0.027, spd1:0.65, spd2:1.0,  fill:'rgba(10,42,90,0.65)',   foam:'rgba(120,185,255,0.55)', fw:1.5 },
    { yBase:0.83, amp1:5,  amp2:3,  freq1:0.012, freq2:0.023, spd1:0.5,  spd2:0.85, fill:'rgba(7,32,72,0.75)',    foam:'rgba(140,200,255,0.6)',  fw:1.8 },
    { yBase:0.91, amp1:6,  amp2:3,  freq1:0.010, freq2:0.019, spd1:0.38, spd2:0.7,  fill:'rgba(5,24,55,0.88)',    foam:'rgba(180,220,255,0.7)',  fw:2.2 },
  ];

  for (const w of waves) {
    const baseY = H * w.yBase;
    ctx.save();
    ctx.beginPath();
    ctx.lineTo(0, H);
    smoothWave(baseY, w.amp1, w.amp2, w.freq1, w.freq2, w.spd1, w.spd2);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = w.fill;
    ctx.fill();

    // foam crest
    ctx.beginPath();
    smoothWave(baseY, w.amp1, w.amp2, w.freq1, w.freq2, w.spd1, w.spd2);
    ctx.lineWidth = w.fw;
    ctx.strokeStyle = w.foam;
    ctx.stroke();
    ctx.restore();
  }
}

// ── Stars ──────────────────────────────────────────────────
const stars = [];
function initStars() {
  stars.length = 0;
  for (let i = 0; i < 180; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2,
      alpha: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.005 + Math.random() * 0.015,
      twinkleDir: Math.random() > 0.5 ? 1 : -1,
    });
  }
}
initStars();
window.addEventListener('resize', () => { resize(); initStars(); });
function drawStars() {
  ctx.save();
  for (const s of stars) {
    s.alpha += s.twinkleSpeed * s.twinkleDir;
    if (s.alpha > 1 || s.alpha < 0.2) s.twinkleDir *= -1;
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Mouse trail ────────────────────────────────────────────
const trail = [];
function addTrail(x, y) {
  trail.push({ x, y, alpha: 0.7 });
  if (trail.length > 50) trail.shift();
}
function drawTrail() {
  ctx.save();
  for (const t of trail) {
    t.alpha -= 0.022;
    if (t.alpha <= 0) continue;
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = 'rgba(255,200,80,1)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── Fireworks ──────────────────────────────────────────────
const fireworks = [];
const particles = [];
const MAX_PARTICLES = 20000;

function spawnFirework(tx, ty) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  startMusic();
  playLaunch();
  fireworks.push({
    x: W * 0.25 + Math.random() * W * 0.5,
    y: H + 10,
    tx, ty: ty * 0.25 + H * 0.08,
    speed: 14,
    trail: [],
    wobble: (Math.random() - 0.5) * 0.8,
  });
}

function updateFireworks() {
  for (let i = fireworks.length - 1; i >= 0; i--) {
    const f = fireworks[i];
    const dx = f.tx - f.x, dy = f.ty - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    f.trail.push({ x: f.x, y: f.y });
    if (f.trail.length > 14) f.trail.shift();
    if (dist < f.speed) {
      explode(f.x, f.y);
      playBoom();
      fireworks.splice(i, 1);
    } else {
      // slight perpendicular wobble for natural arc
      const nx = -dy / dist, ny = dx / dist;
      f.x += (dx / dist) * f.speed + nx * f.wobble;
      f.y += (dy / dist) * f.speed + ny * f.wobble;
    }
  }
}

const TYPES = ['sphere', 'ring', 'willow', 'star', 'chrysanthemum'];

function mkParticle(x, y, angle, speed, opts = {}) {
  if (particles.length >= MAX_PARTICLES) return; // drop new, keep existing
  particles.push({
    x, y, px: x, py: y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    alpha: opts.alpha ?? 1,
    hue: opts.hue ?? 0,
    sat: opts.sat ?? 100,
    size: opts.size ?? 1.2,
    gravity: opts.gravity ?? 0.04,
    drag: opts.drag ?? 0.985,
    fade: opts.fade ?? 0.013,
    // second burst config
    burst2: opts.burst2 ?? null,
    burst2done: false,
    burst2at: opts.burst2at ?? 0.4, // alpha threshold to trigger
  });
}

function explode(x, y, type) {
  if (!type) type = TYPES[Math.floor(Math.random() * TYPES.length)];
  const hue = Math.random() * 360;
  const hue2 = (hue + 120 + Math.random() * 80) % 360;

  // First burst: small white/bright core expanding outward
  const firstCount = 30;
  for (let i = 0; i < firstCount; i++) {
    const angle = (Math.PI * 2 * i) / firstCount;
    mkParticle(x, y, angle, 0.8 + Math.random() * 1.2, {
      hue, sat: 15, size: 2, fade: 0.05,
      burst2: { type, hue, hue2, x, y },
      burst2at: 0.75,
    });
  }
}

function triggerBurst2(p) {
  const { type, hue, hue2, x, y } = p.burst2;
  const bx = p.x, by = p.y;

  if (type === 'sphere') {
    for (let i = 0; i < 80; i++) {
      const a = (Math.PI * 2 * i) / 80 + (Math.random() - 0.5) * 0.2;
      const spd = 1.2 + Math.random() * 2.8;
      mkParticle(bx, by, a, spd, { hue: hue + (Math.random()-0.5)*50, size: 1.2 });
    }

  } else if (type === 'ring') {
    for (let i = 0; i < 90; i++) {
      const a = (Math.PI * 2 * i) / 90;
      mkParticle(bx, by, a, 2.8 + Math.random() * 0.4, { hue, size: 1.5, fade: 0.008 });
    }

  } else if (type === 'willow') {
    for (let i = 0; i < 70; i++) {
      const a = (Math.PI * 2 * i) / 70 + (Math.random()-0.5)*0.3;
      mkParticle(bx, by, a, 0.8 + Math.random() * 2, {
        hue: hue + (Math.random()-0.5)*30,
        gravity: 0.1, drag: 0.975, fade: 0.006, size: 1,
      });
    }

  } else if (type === 'star') {
    for (let pt = 0; pt < 5; pt++) {
      const base = (Math.PI * 2 * pt) / 5 - Math.PI / 2;
      for (let j = 0; j < 12; j++) {
        const spread = (j / 12) * 0.3 - 0.15;
        const isTip = j === 11;
        mkParticle(bx, by, base + spread, 1.5 + (j/12)*2.5, {
          hue: pt % 2 === 0 ? hue : hue2, size: 1.4, fade: 0.009,
          burst2: isTip ? { type: '_starTip', hue: pt % 2 === 0 ? hue : hue2 } : null,
          burst2at: isTip ? 0.5 : 0.4,
        });
      }
    }

  } else if (type === 'chrysanthemum') {
    // dense even sphere with long thin tails
    for (let i = 0; i < 100; i++) {
      const a = (Math.PI * 2 * i) / 100;
      mkParticle(bx, by, a, 1.8 + Math.random() * 1.5, {
        hue: hue + (Math.random()-0.5)*20,
        drag: 0.992, fade: 0.006, size: 0.9,
      });
    }
  } else if (type === '_starTip') {
    // small burst at each star tip
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      mkParticle(bx, by, a, 0.5 + Math.random() * 1.8, {
        hue, sat: 100, size: 1, fade: 0.018,
      });
    }
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.px = p.x; p.py = p.y;
    p.vy += p.gravity;
    p.vx *= p.drag; p.vy *= p.drag;
    p.x += p.vx; p.y += p.vy;
    p.alpha -= p.fade;
    if (p.burst2 && !p.burst2done && p.alpha <= p.burst2at) {
      p.burst2done = true;
      triggerBurst2(p);
    }
    if (p.alpha <= 0) particles.splice(i, 1);
  }
}

function drawFireworks() {
  ctx.save();
  for (const f of fireworks) {
    for (let i = 0; i < f.trail.length; i++) {
      ctx.globalAlpha = (i / f.trail.length) * 0.7;
      ctx.fillStyle = 'rgba(255,240,160,1)';
      ctx.beginPath();
      ctx.arc(f.trail[i].x, f.trail[i].y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(f.x, f.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    ctx.strokeStyle = `hsl(${p.hue},${p.sat}%,80%)`;
    ctx.lineWidth = p.size;
    ctx.beginPath();
    ctx.moveTo(p.px, p.py);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Input ──────────────────────────────────────────────────
let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  hint.style.opacity = '0';
  setTimeout(() => hint.remove(), 1600);
}

window.addEventListener('mousemove', e => addTrail(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
  addTrail(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

window.addEventListener('click', e => {
  hideHint();
  spawnFirework(e.clientX, e.clientY);
});
window.addEventListener('touchend', e => {
  hideHint();
  spawnFirework(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
});

// ── Main loop ──────────────────────────────────────────────
function loop() {
  drawBackground();

  drawStars();
  drawTrail();
  updateFireworks();
  drawFireworks();
  updateParticles();
  drawParticles();

  // redraw mountains on top so fireworks don't bleed below horizon
  ctx.save();
  ctx.beginPath();
  const nearPeaks = [
    [0,0.82],[0.08,0.7],[0.18,0.76],[0.3,0.65],[0.42,0.72],
    [0.55,0.63],[0.65,0.7],[0.76,0.66],[0.88,0.73],[1.0,0.78],[1.0,1],[0,1],
  ];
  ctx.moveTo(0, H);
  for (const [rx, ry] of nearPeaks) ctx.lineTo(rx * W, ry * H);
  ctx.closePath();
  ctx.fillStyle = '#03060f';
  ctx.fill();
  ctx.restore();

  requestAnimationFrame(loop);
}

// draw static starfield first frame
ctx.fillStyle = 'rgb(2,4,18)';
ctx.fillRect(0, 0, W, H);
requestAnimationFrame(loop);
