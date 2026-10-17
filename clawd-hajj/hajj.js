// hajj.js: Clawd's pilgrimage. Dawn: he sees the thin moon and puts on the white ihram cloth. Noon: the long road;
// the Kaaba rises over a dune. Evening: he circles it among small pilgrims, then raises his arms. No text anywhere.
// STORYBOARD.md has the reads. All shots are pure functions of t.
(() => {
  const GOLD = ['#C98A2B', '#E8AA38'];            // wipe colours, the same on both sides of every cut
  const BLACK = '#34293D', BLACK_DK = '#1F1826';  // the Kaaba cloth (never pure black)

  // ---------- set pieces ----------
  const sky3 = (k, top, mid, low) => k < 1 ? [mixCol(top[0], top[1], k), mixCol(mid[0], mid[1], k)] : [mixCol(top[1], top[2], k - 1), mixCol(mid[1], mid[2], k - 1)];
  // k: 0 dawn, 1 noon, 2 evening
  function sky(k) {
    boilSeed('sky');
    const [a, b] = sky3(k, ['#E9A0A8', '#8EC3E6', '#E48F72'], ['#F7D2A6', '#E9F1EC', '#F6C27A']);
    paint(rectPts(-900, -500, W + 3800, H + 900), { wash: a, ink: null });
    paint(ellPts(W / 2, H * .78, W * 1.4, H * .42, 30, 12), { fill: b, fillOp: 170, bleed: .3, tex: .6, ink: null });
    return a;
  }
  // a dune layer: top edge y(x) over x0..x1, filled down to the bottom of the frame
  function dune(x0, x1, yf, col, key, sw = 1) {
    boilSeed(key);
    const P = []; for (let x = x0; x <= x1; x += 90) P.push([x, yf(x) + jit(2)]);
    paint([...P, [x1, H + 400], [x0, H + 400]], { wash: col, fill: mixCol(col, '#A8743C', .3), fillOp: 70, bleed: .08, tex: .5, ink: PAL.ink, sw });
  }
  // the Kaaba as a flat, hand-drawn cube: front face, narrow side face, a plain gold band, no writing. (x, y) = centre of its base
  function kaaba(x, y, s, key) {
    boilSeed(key);
    const w = 1.2 * s, h = 1.3 * s, sd = .5 * s;
    paint([[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2, y], [x - w / 2, y]], { wash: BLACK, ink: PAL.ink, sw: clamp(s / 80, .5, 1.3) });
    paint([[x + w / 2, y - h], [x + w / 2 + sd, y - h + .12 * s], [x + w / 2 + sd, y + .08 * s], [x + w / 2, y]], { wash: BLACK_DK, ink: PAL.ink, sw: clamp(s / 80, .5, 1.3) });
    paint([[x - w / 2, y - .98 * s], [x + w / 2, y - .98 * s], [x + w / 2, y - .8 * s], [x - w / 2, y - .8 * s]], { wash: PAL.ochre, ink: null });
    paint([[x + w / 2, y - .98 * s], [x + w / 2 + sd, y - .86 * s], [x + w / 2 + sd, y - .68 * s], [x + w / 2, y - .8 * s]], { wash: mixCol(PAL.ochre, BLACK_DK, .35), ink: null });
  }
  // the ihram: two plain white cloths, a wrap round the lower body and a hanging fold. k: 0..1 unfurling
  function ihram(view, k) {
    return (u, sw) => {
      if (k <= 0) return;
      const V = VIEWS[view] || VIEWS.front, L = V.L * u, R = V.R * u, h = 2.0 * u * clamp(k, 0, 1.15), y1 = -2 * u + .15 * u;
      paint(rrPts(L - .25 * u, y1 - h, R - L + .5 * u, h, .45 * u, .6), { wash: PAL.cream, fill: PAL.paper, fillOp: 90, ink: PAL.ink, sw });
      if (V.face) paint([[R - 2.2 * u, y1 - h], [R - .5 * u, y1 - h + .2 * u], [R - .9 * u, y1 + .2 * u], [R - 2.6 * u, y1 + .1 * u]], { wash: mixCol(PAL.cream, PAL.sky, .25), ink: PAL.ink, sw: sw * .8 });
    };
  }
  // a small distant pilgrim in white: body, head, two stubby legs. (x, y) = feet
  function pilgrim(x, y, s, i, step) {
    boilSeed('pg' + i);
    const sw = clamp(s * 1.1, .5, 1);
    paint(rrPts(x - 11 * s, y - 52 * s + Math.abs(Math.sin(step)) * -2, 22 * s, 38 * s, 7 * s, .5), { wash: PAL.cream, ink: PAL.ink, sw });
    paint(ellPts(x, y - 61 * s, 8 * s, 8.5 * s, 12, .4), { wash: ['#B7805C', '#8F5F43', '#D7A57E', '#6F4A38'][i % 4], ink: PAL.ink, sw });
    for (const sgn of [-1, 1]) inkLine([[x + sgn * 5 * s, y - 14 * s], [x + sgn * 5 * s + Math.sin(step + sgn) * 3 * s, y]], sw, PAL.ink, 'ink', 0);
  }

  // ---------- shot A: the moon (0 - 3.8) ----------
  const sandA = mixCol('#E8C48A', '#C99A6A', .2);
  function shotMoon(t, lt, dur) {
    camBegin(kf(t, [[0, 940], [3.8, 990]]), kf(t, [[0, 560], [3.8, 540]]), kf(t, [[0, 1], [3.5, 1.1]]));
    const sk = sky(0);
    const noticed = seg(t, 1.0, 1.9);
    glow(1500, 200, 60 + 260 * noticed, '#FFE7B0', .2 + .8 * noticed);
    boilSeed('moon');
    const cres = [], mx = 1500, my = 200, R0 = 62, R1 = 56, off = 30;   // outer arc of the disc, then back along an inner arc
    for (let i = 0; i <= 14; i++) { const q = lerp(.62, 1.38, i / 14) * Math.PI; cres.push([mx + Math.cos(q) * R0 + jit(1), my - Math.sin(q) * R0 + jit(1)]); }
    for (let i = 14; i >= 0; i--) { const q = lerp(.62, 1.38, i / 14) * Math.PI; cres.push([mx + off + Math.cos(q) * R1 * .96, my - 10 - Math.sin(q) * R1]); }
    paint(cres, { wash: PAL.cream, ink: PAL.ink, sw: .8, curv: .5 });
    for (let i = 0; i < 14; i++) { boilSeed('st' + i); const tw = .5 + .5 * Math.sin(t * (1.5 + hash(i)) + i); paint(starPts(hash(i) * 2200 - 100, hash(i + 50) * 360 + 10, 3 + 4 * hash(i + 9) * tw, .35, 4), { wash: PAL.cream, washOp: 90 + 120 * tw * (1 - .6 * seg(t, 0, 3)), ink: null }); }
    dune(-600, 2600, x => 880 + 40 * Math.sin(x * .004 + 1) - 90 * Math.exp(-(((x - 1900) / 500) ** 2)), mixCol('#D9A878', '#C98E78', .3), 'dfar', .8);
    dune(-600, 2600, x => 1000 + 26 * Math.sin(x * .0035) - 10 * Math.cos(x * .01), sandA, 'dnear');

    const x = 860, y = 905, u = 26;
    const mood = emotions(t, [[0, 'sleepy'], [.9, 'surprised', { lookX: .8, lookY: -1 }], [1.7, 'hopeful', { lookX: .6, lookY: -.5 }], [2.6, 'determined']]);
    const face = t < 3.0 ? {} : turn(t, 3.0, 3.2, 0, .25);
    const view = face.view || 'front';
    clawd(x, y, u, { ...mood, ...face, draw: ihram(view, backOut(seg(t, 1.9, 2.5))) });
    camEnd();
    if (lt < .45) iris(...toScreenAt(x, y - 4 * u, 940, 560, 1), lerp(0, 1500, easeIn(lt / .45)));
    if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6, GOLD);
  }
  // toScreen only works inside a camera; for the iris after camEnd, rebuild it from the camera numbers
  function toScreenAt(x, y, cx, cy, zoom) { return [W / 2 + (x - cx) * zoom, H / 2 + (y - cy) * zoom]; }

  // ---------- shot B: the road (3.8 - 8.0) ----------
  const gY = x => 900 + 14 * Math.sin(x * .004);
  function shotRoad(t, lt, dur) {
    const lt2 = t - 3.8, w = stroll(t, 4.1, 6.0, 400, 2300, 22);
    const camx = lerp(w.x + 180, 2560, ease(seg(t, 6.0, 7.3))), zoom = lerp(1, 1.12, ease(seg(t, 6.0, 7.3)));
    camBegin(camx, 640, zoom);
    sky(1);
    boilSeed('sun'); glow(camx + 500, 150, 420, '#FFF3C8', .5);
    boilSeed('sunb'); paint(ellPts(camx + 500, 150, 62, 62, 28, 1.2), { wash: '#FFF2C0', fill: PAL.ochre, fillOp: 50, ink: PAL.ink, sw: .7 });
    const par = (p, f) => { push(); translate(camx * (1 - p), 0); f(); pop(); };
    par(.85, () => {
      const k = ease(seg(t, 6.0, 6.9)), s = 52;
      kaaba(2620, 760 + (1 - k) * 1.3 * s + 8, s, 'kaaba-far');          // rises from behind the far dune
      dune(1000, 3600, x => 790 + 22 * Math.sin(x * .006) , mixCol('#E2BE92', '#D9A8A0', .4), 'dfar2', .7);
    });
    par(.55, () => dune(-400, 4000, x => 830 + 28 * Math.sin(x * .0045 + 2), mixCol('#E3C08A', '#CF9F74', .35), 'dmid', .9));
    dune(-400, 4000, x => gY(x) + 8, '#EDCB8E', 'dnear', 1.1);
    const mood = emotions(t, [[4.1, 'determined'], [5.0, 'nervous', { emote: 'sweat' }], [6.0, 'surprised', { lookX: 1, lookY: -.3 }], [6.9, 'starstruck']]);
    const moving = t > 4.1 && t < 6.0;
    const pose = moving ? { view: 'side', walk: w.walk, dy: (mood.dy || 0) * .4 + w.dy } : t < 4.1 ? { view: 'side' } : { view: 'q' };
    const ih = ihram(pose.view || 'q', 1);
    clawd(w.x, gY(w.x) + 2, 22, { ...mood, ...pose, draw: ih });
    camEnd();
    if (lt < .3) brushWipe(.5 + lt / .6, GOLD);
    if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6, GOLD);
  }

  // ---------- shot C: the circling (8.0 - 14) ----------
  const CX = 960, CY = 770, RX = 520, RY = 140;
  function shotCircle(t, lt, dur) {
    const a = ease(seg(t, 9.0, 12.0)), ang = TAU * a, cs = Math.cos(ang);
    const push_ = ease(seg(t, 12.0, 13.4));
    const camCx = 960, camCy = lerp(640, 700, push_), zoom = lerp(1, 1.32, push_);
    camBegin(camCx, camCy, zoom);
    sky(2);
    boilSeed('sunE'); glow(960, 560, 900, '#FFD28A', .35 + .5 * push_);
    boilSeed('plaza'); paint(ellPts(CX, 800, 1250, 330, 40, 6), { wash: '#EBCB98', fill: '#F6DDAE', fillOp: 120, bleed: .1, tex: .5, ink: null });
    boilSeed('ring'); paint(ellPts(CX, CY, RX + 110, RY + 60, 40, 3), { fill: '#C9985C', fillOp: 40, ink: null });
    // everyone on the ring as (depth, draw) so that the ones behind the cube are drawn first
    const crowd = [];
    for (let i = 0; i < 14; i++) {
      const sp = .045 + .02 * hash(i + 3), ph = frac(hash(i) + t * sp * (i % 3 ? 1 : .8)), th = TAU * ph, r = 1 + (hash(i + 20) - .5) * .5;
      const px = CX + (RX + 40) * r * Math.sin(th), py = CY + (RY + 20) * r * Math.cos(th), dep = (py - 620) / 340;
      crowd.push([Math.cos(th), () => pilgrim(px, py, lerp(.7, 1.1, clamp(dep)), i, t * 5 + i)]);
    }
    // Clawd: stands at the front, turns, walks one full circuit (front, right, back, left), stops at the front
    const px = CX + RX * Math.sin(ang), py = CY + RY * cs, u = lerp(20, 28, (cs + 1) / 2);
    let pose;
    if (t < 8.9) pose = { view: 'q' };
    else if (t < 9.05) pose = turn(t, 8.9, 9.05, 0, .25);
    else if (t < 12.0) pose = { ...spinView(.25 + a), walk: a * 36, dy: -Math.abs(Math.sin(a * 36 * Math.PI)) * .5 };
    else pose = turn(t, 12.0, 12.2, 1.25, 1.0);
    const mood = emotions(t, [[8.0, 'starstruck', { lookY: -.8 }], [9.0, 'determined'], [11.9, 'relieved'], [12.5, 'love', { emote: 'hearts' }]]);
    const arms = t > 12.3 ? { aL: 1.25 * backOut(seg(t, 12.3, 12.9)), aR: 1.25 * backOut(seg(t, 12.35, 12.95)) } : {};
    crowd.push([cs, () => clawd(px, py, u, { ...mood, ...pose, ...arms, dy: (mood.dy || 0) * (t < 9.05 || t > 12 ? 1 : .4) + (pose.dy || 0), draw: ihram(pose.view || 'front', 1) })]);
    crowd.sort((p, q) => p[0] - q[0]);
    for (const [c, f] of crowd) if (c < -.05) f();
    kaaba(CX, 700, 175, 'kaaba');
    for (const [c, f] of crowd) if (c >= -.05) f();
    if (t > 12.2) { boilSeed('halo'); glow(px, py - 4 * u, 300 * ease(seg(t, 12.2, 13.0)), '#FFE7A8', .7); }
    camEnd();
    if (lt < .3) brushWipe(.5 + lt / .6, GOLD);
    if (lt > dur - .7) { const r = lerp(1500, 0, easeIn(clamp((lt - (dur - .7)) / .65))); iris(...toScreenAt(px, py - 4 * u, camCx, camCy, zoom), r); }
  }

  shots([[0, shotMoon], [3.8, shotRoad], [8.0, shotCircle]]);
})();
