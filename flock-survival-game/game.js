(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const UI = {
    day: document.getElementById('dayLabel'),
    time: document.getElementById('timeLabel'),
    sheep: document.getElementById('sheepLabel'),
    lambs: document.getElementById('lambLabel'),
    food: document.getElementById('foodLabel'),
    explore: document.getElementById('exploreLabel'),
    home: document.getElementById('homeBtn'),
    gate: document.getElementById('gateBtn'),
    pause: document.getElementById('pauseBtn'),
    report: document.getElementById('nightReport'),
    nightText: document.getElementById('nightText'),
    cont: document.getElementById('continueBtn'),
    toast: document.getElementById('toast'),
  };

  const WORLD = { w: 2600, h: 1800, tile: 52 };
  const HOME = { x: 180, y: 180, w: 520, h: 380, gateX: 700, gateY: 370, gateOpen: true };
  const DAY_LENGTH = 105; // seconds per day
  const NIGHT_LENGTH = 22;
  const rng = mulberry32(928371);

  let view = { x: 0, y: 0, scale: 1 };
  let pointer = { active: false, x: HOME.x + HOME.w * 0.5, y: HOME.y + HOME.h * 0.5 };
  let paused = false;
  let phase = 'day';
  let day = 1;
  let dayTimer = 0;
  let nightTimer = 0;
  let reportReady = false;
  let totalBirths = 0;
  let totalLosses = 0;
  let discoveries = new Set();

  const grass = [];
  const explored = new Set();
  const sheep = [];
  const wolves = [];
  const features = [];
  const particles = [];

  function mulberry32(a) {
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.scale = Math.max(innerWidth / 900, 0.78);
  }

  addEventListener('resize', resize);
  resize();

  function init() {
    makeWorld();
    for (let i = 0; i < 8; i++) {
      addSheep(HOME.x + 160 + rng() * 180, HOME.y + 120 + rng() * 110, i < 2 ? 'lamb' : 'adult');
    }
    for (let i = 0; i < 3; i++) spawnWolf(true);
    pointer.x = HOME.x + HOME.w * 0.5;
    pointer.y = HOME.y + HOME.h * 0.52;
    toast('Tap somewhere. The flock will graze, explore, and try to survive the night.');
  }

  function makeWorld() {
    const cols = Math.ceil(WORLD.w / WORLD.tile);
    const rows = Math.ceil(WORLD.h / WORLD.tile);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const nx = x / cols;
        const ny = y / rows;
        const nearHome = x * WORLD.tile < 760 && y * WORLD.tile < 620;
        const moisture = clamp(0.4 + 0.34 * Math.sin(nx * 9) + 0.22 * Math.cos(ny * 8) + (rng() - 0.5) * 0.5, 0, 1);
        const nutrition = nearHome ? 0.8 : clamp(0.25 + moisture * 0.7 + rng() * 0.28, 0.1, 1.1);
        grass.push({ x, y, nutrition, growth: nearHome ? 0.95 : clamp(0.25 + rng() * 0.75, 0.1, 1), eaten: 0 });
      }
    }

    const names = ['Clover Patch', 'Salt Lick', 'Old Oak', 'Stone Circle', 'Stream Bend', 'Wild Thyme', 'Hidden Meadow', 'Ruined Gate'];
    for (let i = 0; i < names.length; i++) {
      features.push({
        name: names[i],
        x: 820 + rng() * (WORLD.w - 980),
        y: 180 + rng() * (WORLD.h - 330),
        found: false,
        kind: i % 4
      });
    }
  }

  function addSheep(x, y, age = 'adult') {
    const lamb = age === 'lamb';
    sheep.push({
      id: cryptoRandom(),
      x, y,
      vx: 0, vy: 0,
      age,
      size: lamb ? 0.72 : 1,
      hunger: lamb ? 0.72 : 0.86,
      stamina: 0.75 + rng() * 0.25,
      curiosity: rng(),
      courage: rng(),
      life: lamb ? 0 : 3 + rng() * 7,
      mother: null,
      alive: true,
      flash: 0,
      name: sheepName(),
    });
  }

  function sheepName() {
    const bits = ['Moss','Nettle','Pip','Bracken','Cloud','Button','Fern','Pebble','Wisp','Clover','Bramble','Pearl'];
    return bits[Math.floor(rng() * bits.length)];
  }

  function cryptoRandom() {
    return Math.floor((rng() * 1e9)).toString(36);
  }

  function spawnWolf(edge = false) {
    let x, y;
    if (edge) {
      const side = Math.floor(rng() * 4);
      x = side === 0 ? -80 : side === 1 ? WORLD.w + 80 : rng() * WORLD.w;
      y = side === 2 ? -80 : side === 3 ? WORLD.h + 80 : rng() * WORLD.h;
    } else {
      x = 920 + rng() * (WORLD.w - 1040);
      y = 180 + rng() * (WORLD.h - 260);
    }
    wolves.push({ x, y, vx: 0, vy: 0, hunger: 0.5 + rng() * 0.5, active: false, cooldown: 0 });
  }

  function screenToWorld(sx, sy) {
    return { x: sx / view.scale + view.x, y: sy / view.scale + view.y };
  }

  function setPointerFromEvent(e) {
    const p = e.touches ? e.touches[0] : e;
    const w = screenToWorld(p.clientX, p.clientY);
    pointer.x = clamp(w.x, 24, WORLD.w - 24);
    pointer.y = clamp(w.y, 24, WORLD.h - 24);
    pointer.active = true;
  }

  canvas.addEventListener('pointerdown', e => { setPointerFromEvent(e); });
  canvas.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') setPointerFromEvent(e); });

  UI.home.onclick = () => {
    pointer.x = HOME.x + HOME.w * 0.48;
    pointer.y = HOME.y + HOME.h * 0.48;
    pointer.active = true;
    toast('The bell rings. The flock turns for home.');
  };
  UI.gate.onclick = () => {
    HOME.gateOpen = !HOME.gateOpen;
    UI.gate.textContent = `Gate: ${HOME.gateOpen ? 'Open' : 'Closed'}`;
    toast(HOME.gateOpen ? 'The gate is open.' : 'The gate is closed. Sheep inside are safer.');
  };
  UI.pause.onclick = () => {
    paused = !paused;
    UI.pause.textContent = paused ? 'Resume' : 'Pause';
  };
  UI.cont.onclick = () => startNextDay();

  function update(dt) {
    if (paused || reportReady) return;

    if (phase === 'day') {
      dayTimer += dt;
      if (dayTimer >= DAY_LENGTH) startNight();
    } else {
      nightTimer += dt;
      if (nightTimer >= NIGHT_LENGTH) resolveNight();
    }

    updateGrass(dt);
    updateSheep(dt);
    updateWolves(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateDiscoveries();
    updateUI();
  }

  function updateGrass(dt) {
    for (const g of grass) {
      const regen = phase === 'day' ? 0.012 : 0.006;
      g.growth = clamp(g.growth + regen * dt * (0.35 + g.nutrition), 0, 1);
    }
  }

  function updateSheep(dt) {
    const center = flockCenter();
    for (const s of sheep) {
      if (!s.alive) continue;
      s.life += dt / DAY_LENGTH;
      if (s.age === 'lamb' && s.life > 1.8) { s.age = 'adult'; s.size = 1; pop(s.x, s.y, '#fff7ad'); }
      s.hunger = clamp(s.hunger - dt * (phase === 'day' ? 0.018 : 0.028) * (s.age === 'lamb' ? 1.18 : 1), 0, 1);

      let ax = 0, ay = 0;
      const targetWeight = phase === 'day' ? 0.45 + s.curiosity * 0.35 : 0.85;
      const target = phase === 'night' ? { x: HOME.x + HOME.w * 0.48, y: HOME.y + HOME.h * 0.48 } : pointer;
      ax += (target.x - s.x) * 0.0018 * targetWeight;
      ay += (target.y - s.y) * 0.0018 * targetWeight;

      // flock cohesion and separation
      ax += (center.x - s.x) * 0.0008;
      ay += (center.y - s.y) * 0.0008;
      for (const o of sheep) {
        if (o === s || !o.alive) continue;
        const dx = s.x - o.x, dy = s.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < 900) {
          const f = 0.06 / Math.max(30, d2);
          ax += dx * f; ay += dy * f;
        }
      }

      // seek nearby grass if hungry during day
      if (phase === 'day' && s.hunger < 0.82) {
        const best = bestGrassNear(s.x, s.y);
        if (best) {
          const gx = best.x * WORLD.tile + WORLD.tile / 2;
          const gy = best.y * WORLD.tile + WORLD.tile / 2;
          ax += (gx - s.x) * 0.0022 * (1 - s.hunger);
          ay += (gy - s.y) * 0.0022 * (1 - s.hunger);
        }
      }

      // avoid wolves
      for (const w of wolves) {
        const dx = s.x - w.x, dy = s.y - w.y;
        const d = Math.hypot(dx, dy);
        if (d < 220) {
          const panic = (220 - d) / 220;
          ax += (dx / Math.max(d, 1)) * panic * 2.8;
          ay += (dy / Math.max(d, 1)) * panic * 2.8;
          s.flash = 0.2;
        }
      }

      // simple fence collision: closed gate traps sheep inside/outside
      if (!HOME.gateOpen && intersectsFenceLine(s.x, s.y, s.vx * dt, s.vy * dt)) {
        ax *= -2; ay *= -2;
      }

      const maxSpeed = (s.age === 'lamb' ? 55 : 78) * (0.72 + s.stamina * 0.42) * (s.hunger < 0.16 ? 0.55 : 1);
      s.vx = clamp(s.vx + ax * 68 * dt, -maxSpeed, maxSpeed);
      s.vy = clamp(s.vy + ay * 68 * dt, -maxSpeed, maxSpeed);
      s.vx *= 0.91; s.vy *= 0.91;
      s.x = clamp(s.x + s.vx * dt, 14, WORLD.w - 14);
      s.y = clamp(s.y + s.vy * dt, 14, WORLD.h - 14);
      s.flash = Math.max(0, s.flash - dt);

      graze(s, dt);
      markExplored(s.x, s.y);
    }
  }

  function bestGrassNear(x, y) {
    const tx = Math.floor(x / WORLD.tile);
    const ty = Math.floor(y / WORLD.tile);
    let best = null, score = -1;
    for (let yy = ty - 1; yy <= ty + 1; yy++) {
      for (let xx = tx - 1; xx <= tx + 1; xx++) {
        const g = grass.find(t => t.x === xx && t.y === yy);
        if (!g) continue;
        const s = g.growth * g.nutrition;
        if (s > score) { score = s; best = g; }
      }
    }
    return best;
  }

  function graze(s, dt) {
    if (phase !== 'day') return;
    const tx = Math.floor(s.x / WORLD.tile);
    const ty = Math.floor(s.y / WORLD.tile);
    const g = grass.find(t => t.x === tx && t.y === ty);
    if (!g || g.growth < 0.08) return;
    const rate = dt * 0.14 * (s.age === 'lamb' ? 0.75 : 1);
    const eaten = Math.min(g.growth, rate);
    g.growth -= eaten;
    g.eaten += eaten;
    s.hunger = clamp(s.hunger + eaten * 0.85 * g.nutrition, 0, 1);
    if (rng() < dt * 0.9) particles.push({ x: s.x + rand(-8,8), y: s.y + rand(-5,8), life: 0.8, c: '#e6f7b0' });
  }

  function updateWolves(dt) {
    for (const w of wolves) {
      w.cooldown = Math.max(0, w.cooldown - dt);
      w.active = phase === 'night' || dayTimer > DAY_LENGTH * 0.76;
      let ax = 0, ay = 0;
      if (w.active) {
        const vulnerable = sheep.filter(s => s.alive && (!isInsideHome(s.x, s.y) || HOME.gateOpen));
        let target = nearest(w, vulnerable);
        if (target) {
          const dx = target.x - w.x, dy = target.y - w.y;
          const d = Math.hypot(dx, dy);
          ax += dx / Math.max(1, d) * 1.2;
          ay += dy / Math.max(1, d) * 1.2;
          if (d < 24 && w.cooldown <= 0 && phase === 'night') {
            const risk = target.age === 'lamb' ? 0.82 : 0.42;
            if (rng() < risk) loseSheep(target, 'wolf');
            w.cooldown = 4.5;
          }
        }
      } else {
        ax += Math.sin(performance.now() * 0.0002 + w.x) * 0.2;
        ay += Math.cos(performance.now() * 0.0002 + w.y) * 0.2;
      }
      const max = w.active ? 105 : 34;
      w.vx = clamp((w.vx + ax * 90 * dt) * 0.95, -max, max);
      w.vy = clamp((w.vy + ay * 90 * dt) * 0.95, -max, max);
      w.x = clamp(w.x + w.vx * dt, -120, WORLD.w + 120);
      w.y = clamp(w.y + w.vy * dt, -120, WORLD.h + 120);
    }
  }

  function loseSheep(s, reason) {
    if (!s.alive) return;
    s.alive = false;
    totalLosses++;
    pop(s.x, s.y, '#d35f4b');
  }

  function resolveNight() {
    phase = 'report';
    reportReady = true;
    const alive = sheep.filter(s => s.alive);
    let lost = 0;
    for (const s of alive) {
      const safe = isInsideHome(s.x, s.y) && !HOME.gateOpen ? 0.03 : isInsideHome(s.x, s.y) ? 0.08 : 0.34;
      const hungry = s.hunger < 0.25 ? 0.26 : s.hunger < 0.5 ? 0.11 : 0;
      const lambRisk = s.age === 'lamb' ? 0.13 : 0;
      if (rng() < safe + hungry + lambRisk) { loseSheep(s, 'night'); lost++; }
    }

    let born = 0;
    const adults = sheep.filter(s => s.alive && s.age === 'adult' && s.hunger > 0.62);
    if (adults.length >= 4) {
      const birthChance = clamp((adults.length - 3) * 0.07 + avg(adults.map(s => s.hunger)) * 0.08, 0, 0.55);
      if (rng() < birthChance) {
        const n = rng() < 0.2 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const m = adults[Math.floor(rng() * adults.length)];
          addSheep(m.x + rand(-16,16), m.y + rand(-16,16), 'lamb');
          born++;
          totalBirths++;
        }
      }
    }

    const fed = Math.round(avg(sheep.filter(s => s.alive).map(s => s.hunger)) * 100) || 0;
    UI.nightText.innerHTML = `The flock settles beneath the dark meadow.<br><br><strong>${lost}</strong> sheep were lost. <strong>${born}</strong> lamb${born === 1 ? '' : 's'} were born. The surviving flock is <strong>${fed}%</strong> fed.`;
    UI.report.classList.remove('hidden');
  }

  function startNight() {
    phase = 'night';
    nightTimer = 0;
    HOME.gateOpen = false;
    UI.gate.textContent = 'Gate: Closed';
    pointer.x = HOME.x + HOME.w * 0.48;
    pointer.y = HOME.y + HOME.h * 0.48;
    toast('Night is coming. The gate closes. Wolves move in the dark.');
    if (wolves.length < 4 + Math.floor(day / 3)) spawnWolf(true);
  }

  function startNextDay() {
    day++;
    dayTimer = 0;
    nightTimer = 0;
    phase = 'day';
    reportReady = false;
    HOME.gateOpen = true;
    UI.gate.textContent = 'Gate: Open';
    UI.report.classList.add('hidden');
    wolves.length = Math.min(wolves.length, 3 + Math.floor(day / 2));
    for (const s of sheep) if (s.alive) s.hunger = clamp(s.hunger + 0.08, 0, 1);
    toast(`Day ${day}. The meadow opens again.`);
  }

  function updateCamera(dt) {
    const c = flockCenter();
    const targetX = clamp(c.x - innerWidth / view.scale / 2, 0, WORLD.w - innerWidth / view.scale);
    const targetY = clamp(c.y - innerHeight / view.scale / 2, 0, WORLD.h - innerHeight / view.scale);
    view.x += (targetX - view.x) * Math.min(1, dt * 2.8);
    view.y += (targetY - view.y) * Math.min(1, dt * 2.8);
  }

  function updateDiscoveries() {
    for (const f of features) {
      if (f.found) continue;
      const near = sheep.some(s => s.alive && Math.hypot(s.x - f.x, s.y - f.y) < 90);
      if (near) {
        f.found = true;
        discoveries.add(f.name);
        pop(f.x, f.y, '#fff0a6');
        toast(`Discovered: ${f.name}`);
      }
    }
  }

  function updateParticles(dt) {
    for (const p of particles) p.life -= dt;
    for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
  }

  function updateUI() {
    const alive = sheep.filter(s => s.alive);
    const lambs = alive.filter(s => s.age === 'lamb').length;
    const fed = Math.round(avg(alive.map(s => s.hunger)) * 100) || 0;
    const exploredPct = Math.round((explored.size / (Math.ceil(WORLD.w / 110) * Math.ceil(WORLD.h / 110))) * 100);
    UI.day.textContent = `Day ${day}`;
    UI.time.textContent = phase === 'day' ? dayName(dayTimer / DAY_LENGTH) : 'Night';
    UI.sheep.textContent = alive.length;
    UI.lambs.textContent = lambs;
    UI.food.textContent = `${fed}%`;
    UI.explore.textContent = `${clamp(exploredPct, 0, 100)}%`;
  }

  function dayName(t) {
    if (t < 0.18) return 'Dawn';
    if (t < 0.55) return 'Day';
    if (t < 0.78) return 'Dusk';
    return 'Late';
  }

  function draw() {
    ctx.save();
    ctx.scale(view.scale, view.scale);
    ctx.translate(-view.x, -view.y);
    drawGround();
    drawFeatures();
    drawHome();
    drawPointer();
    for (const w of wolves) drawWolf(w);
    for (const s of sheep) if (s.alive) drawSheep(s);
    drawParticles();
    drawVignette();
    ctx.restore();
  }

  function drawGround() {
    const sky = phase === 'night' ? '#283152' : dayTimer > DAY_LENGTH * 0.78 ? '#93b96e' : '#9fcf7a';
    ctx.fillStyle = sky;
    ctx.fillRect(view.x, view.y, innerWidth / view.scale, innerHeight / view.scale);

    const startX = Math.floor(view.x / WORLD.tile) - 1;
    const endX = Math.ceil((view.x + innerWidth / view.scale) / WORLD.tile) + 1;
    const startY = Math.floor(view.y / WORLD.tile) - 1;
    const endY = Math.ceil((view.y + innerHeight / view.scale) / WORLD.tile) + 1;
    const cols = Math.ceil(WORLD.w / WORLD.tile);
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || y < 0 || x >= cols) continue;
        const g = grass[y * cols + x];
        if (!g) continue;
        const base = g.growth;
        ctx.fillStyle = base > 0.7 ? '#8fcf61' : base > 0.35 ? '#86bd58' : '#789d51';
        ctx.fillRect(x * WORLD.tile, y * WORLD.tile, WORLD.tile + 1, WORLD.tile + 1);
        if (g.growth > 0.22) {
          ctx.fillStyle = 'rgba(255,255,220,0.22)';
          for (let i = 0; i < 3; i++) {
            const px = x * WORLD.tile + ((i * 17 + x * 11 + y * 7) % WORLD.tile);
            const py = y * WORLD.tile + ((i * 13 + y * 19 + x * 3) % WORLD.tile);
            ctx.fillRect(px, py, 3, 5);
          }
        }
      }
    }

    // subtle world boundary
    ctx.strokeStyle = 'rgba(35,55,30,0.24)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, WORLD.w - 8, WORLD.h - 8);
  }

  function drawHome() {
    ctx.fillStyle = 'rgba(255, 247, 198, 0.13)';
    ctx.fillRect(HOME.x, HOME.y, HOME.w, HOME.h);
    ctx.strokeStyle = '#6d4f2b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(HOME.x, HOME.y); ctx.lineTo(HOME.x + HOME.w, HOME.y);
    ctx.lineTo(HOME.x + HOME.w, HOME.gateY - 34);
    if (!HOME.gateOpen) ctx.lineTo(HOME.x + HOME.w, HOME.gateY + 34);
    else ctx.moveTo(HOME.x + HOME.w, HOME.gateY + 34);
    ctx.lineTo(HOME.x + HOME.w, HOME.y + HOME.h);
    ctx.lineTo(HOME.x, HOME.y + HOME.h); ctx.lineTo(HOME.x, HOME.y);
    ctx.stroke();

    ctx.fillStyle = HOME.gateOpen ? '#f0c169' : '#7b5630';
    ctx.fillRect(HOME.x + HOME.w - 10, HOME.gateY - 36, 20, 72);
    ctx.fillStyle = '#5f4327';
    ctx.fillRect(HOME.x + 26, HOME.y + 22, 70, 48);
    ctx.fillStyle = '#e9d391';
    ctx.fillRect(HOME.x + 36, HOME.y + 31, 50, 30);
  }

  function drawFeatures() {
    for (const f of features) {
      if (!f.found && Math.hypot(f.x - flockCenter().x, f.y - flockCenter().y) > 420) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.globalAlpha = f.found ? 1 : 0.28;
      if (f.kind === 0) { ctx.fillStyle = '#467c35'; ctx.fillRect(-15,-15,30,30); ctx.fillStyle = '#f4e6b0'; ctx.fillRect(-4,-4,8,8); }
      if (f.kind === 1) { ctx.fillStyle = '#d8d2bf'; ctx.fillRect(-18, 5, 36, 10); ctx.fillRect(-9,-12,18,18); }
      if (f.kind === 2) { ctx.fillStyle = '#5b3c22'; ctx.fillRect(-6,-28,12,42); ctx.fillStyle = '#3d7f3a'; ctx.fillRect(-30,-48,60,34); }
      if (f.kind === 3) { ctx.fillStyle = '#6f7780'; ctx.fillRect(-24,-12,12,32); ctx.fillRect(12,-12,12,32); ctx.fillRect(-18,-24,36,10); }
      if (f.found) {
        ctx.fillStyle = 'rgba(20,32,19,0.7)';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(f.name, 0, 38);
      }
      ctx.restore();
    }
  }

  function drawPointer() {
    if (!pointer.active || phase !== 'day') return;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 18 + Math.sin(performance.now() / 180) * 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(20,32,19,0.32)';
    ctx.fillRect(pointer.x - 2, pointer.y - 2, 4, 4);
  }

  function drawSheep(s) {
    const t = performance.now() / 1000;
    const moving = Math.hypot(s.vx, s.vy) > 10;
    const walk = Math.round(Math.sin(t * (moving ? 12 : 4) + s.x * 0.03) * 2);
    const dir = Math.atan2(s.vy, s.vx) || 0;
    const sc = 1.8 * s.size;
    ctx.save();
    ctx.translate(Math.round(s.x), Math.round(s.y));
    if (moving) ctx.rotate(dir);

    ctx.fillStyle = 'rgba(23, 33, 28, 0.12)';
    ctx.fillRect(-9 * sc, 8 * sc, 18 * sc, 5 * sc);

    ctx.fillStyle = s.flash > 0 ? '#ffe2e2' : s.age === 'lamb' ? '#fff9e7' : '#f8f4e8';
    px(-9, -6, 18, 13, sc);
    px(-6, -10, 12, 7, sc);
    ctx.fillStyle = '#e7dfcc'; px(-7, 4, 14, 4, sc);
    ctx.fillStyle = '#2b2b2b'; px(8, -4, 6, 7, sc); // head
    ctx.fillStyle = '#111'; px(11, -2, 1.5, 1.5, sc);
    ctx.fillStyle = '#393939'; px(9, -8, 3, 4, sc); px(9, 3, 3, 4, sc);
    ctx.fillStyle = '#3d302a'; px(-7, 7 + walk, 3, 7, sc); px(2, 7 - walk, 3, 7, sc);
    ctx.restore();
  }

  function drawWolf(w) {
    const active = w.active;
    const dir = Math.atan2(w.vy, w.vx) || 0;
    ctx.save();
    ctx.translate(Math.round(w.x), Math.round(w.y));
    ctx.rotate(dir);
    const sc = 2.1;
    ctx.globalAlpha = active ? 1 : 0.42;
    ctx.fillStyle = 'rgba(5,10,22,0.18)'; px(-12, 7, 24, 5, sc);
    ctx.fillStyle = active ? '#3c4650' : '#59626d'; px(-12, -5, 20, 10, sc);
    ctx.fillStyle = active ? '#252c33' : '#404852'; px(5, -8, 10, 9, sc);
    ctx.fillStyle = '#1b2026'; px(13, -4, 6, 4, sc);
    ctx.fillStyle = '#12161a'; px(-17, -4, 7, 4, sc);
    ctx.fillStyle = '#f6d36b'; px(10, -5, 2, 2, sc);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y - (1 - p.life) * 18, 5, 5);
      ctx.globalAlpha = 1;
    }
  }

  function drawVignette() {
    if (phase !== 'night' && dayTimer < DAY_LENGTH * 0.72) return;
    const darkness = phase === 'night' ? 0.48 : clamp((dayTimer / DAY_LENGTH - 0.72) / 0.28, 0, 1) * 0.32;
    ctx.fillStyle = `rgba(8, 14, 30, ${darkness})`;
    ctx.fillRect(view.x, view.y, innerWidth / view.scale, innerHeight / view.scale);
  }

  function px(x, y, w, h, sc) { ctx.fillRect(Math.round(x * sc), Math.round(y * sc), Math.round(w * sc), Math.round(h * sc)); }

  function markExplored(x, y) {
    const ex = Math.floor(x / 110), ey = Math.floor(y / 110);
    explored.add(`${ex},${ey}`);
  }

  function flockCenter() {
    const alive = sheep.filter(s => s.alive);
    if (!alive.length) return { x: HOME.x + HOME.w / 2, y: HOME.y + HOME.h / 2 };
    return { x: avg(alive.map(s => s.x)), y: avg(alive.map(s => s.y)) };
  }

  function nearest(from, list) {
    let best = null, bd = Infinity;
    for (const item of list) {
      const d = (item.x - from.x) ** 2 + (item.y - from.y) ** 2;
      if (d < bd) { bd = d; best = item; }
    }
    return best;
  }

  function isInsideHome(x, y) { return x > HOME.x && x < HOME.x + HOME.w && y > HOME.y && y < HOME.y + HOME.h; }

  function intersectsFenceLine(x, y, dx, dy) {
    const nx = x + dx, ny = y + dy;
    const crossedRight = x < HOME.x + HOME.w && nx >= HOME.x + HOME.w && y > HOME.y && y < HOME.y + HOME.h;
    if (!crossedRight) return false;
    return !(y > HOME.gateY - 40 && y < HOME.gateY + 40);
  }

  function pop(x, y, c) { for (let i = 0; i < 12; i++) particles.push({ x: x + rand(-12,12), y: y + rand(-12,12), life: 0.7 + rng() * 0.5, c }); }
  function rand(a, b) { return a + rng() * (b - a); }
  function avg(arr) { return arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : 0; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function toast(msg) { UI.toast.textContent = msg; }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  init();
  requestAnimationFrame(loop);
})();
