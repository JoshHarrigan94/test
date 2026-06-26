(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const UI = {
    day: document.getElementById('dayLabel'),
    season: document.getElementById('seasonLabel'),
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
    start: document.getElementById('startScreen'),
    begin: document.getElementById('beginBtn'),
    end: document.getElementById('endScreen'),
    endTitle: document.getElementById('endTitle'),
    endText: document.getElementById('endText'),
    finalStats: document.getElementById('finalStats'),
    restart: document.getElementById('restartBtn'),
    continueMeadow: document.getElementById('continueMeadowBtn'),
    banner: document.getElementById('seasonBanner'),
    warningText: document.getElementById('warningText'),
    destinationInfo: document.getElementById('destinationInfo'),
    destinationTitle: document.getElementById('destinationTitle'),
    destinationText: document.getElementById('destinationText'),
    sheepCard: document.getElementById('sheepCard'),
    sheepName: document.getElementById('sheepName'),
    sheepTrait: document.getElementById('sheepTrait'),
    sheepAge: document.getElementById('sheepAge'),
    sheepHunger: document.getElementById('sheepHunger'),
    sheepParent: document.getElementById('sheepParent'),
    sheepSeason: document.getElementById('sheepSeason'),
    sheepStatus: document.getElementById('sheepStatus'),
    closeCard: document.getElementById('closeCardBtn'),
    journalEntries: document.getElementById('journalEntries'),
  };

  const WORLD = { w: 2600, h: 1800, tile: 52 };
  const HOME = { x: 180, y: 180, w: 520, h: 380, gateX: 700, gateY: 370, gateOpen: true };
  const HOME_CENTER = { x: HOME.x + HOME.w * 0.48, y: HOME.y + HOME.h * 0.48 };
  const DAY_LENGTH = 105;
  const NIGHT_LENGTH = 22;
  const SEASON_DAYS = 10;
  const START_FLOCK = 8;
  const TRAITS = ['Curious', 'Timid', 'Greedy', 'Loyal', 'Hardy', 'Motherly'];
  const rng = mulberry32(928371);
  const SEASON_PHASES = ['Spring', 'Summer', 'Autumn', 'Winter'];

  const BIOMES = {
    home: {
      key: 'home',
      name: 'Home Field',
      baseNutrition: 0.54,
      baseRegrowth: 0.010,
      baseDanger: 0.08,
      overgrazing: 1.35,
      colorA: '#97c86d',
      colorB: '#84b85d',
      labelX: 420,
      labelY: 310,
      describeFood: 'Fair food',
      describeDanger: 'low danger',
    },
    clover: {
      key: 'clover',
      name: 'Clover Meadow',
      baseNutrition: 0.96,
      baseRegrowth: 0.014,
      baseDanger: 0.22,
      overgrazing: 0.92,
      colorA: '#8fd95e',
      colorB: '#74c64f',
      labelX: 1080,
      labelY: 520,
      describeFood: 'Rich food',
      describeDanger: 'steady danger',
    },
    stream: {
      key: 'stream',
      name: 'Stream Bank',
      baseNutrition: 0.7,
      baseRegrowth: 0.021,
      baseDanger: 0.28,
      overgrazing: 0.86,
      colorA: '#7fc7a7',
      colorB: '#63b694',
      labelX: 1550,
      labelY: 1120,
      describeFood: 'Fresh food',
      describeDanger: 'some danger',
    },
    forest: {
      key: 'forest',
      name: 'Forest Edge',
      baseNutrition: 1.1,
      baseRegrowth: 0.013,
      baseDanger: 0.7,
      overgrazing: 1.08,
      colorA: '#5e9b53',
      colorB: '#4b8242',
      labelX: 2140,
      labelY: 560,
      describeFood: 'Rich food',
      describeDanger: 'high danger',
    },
    hill: {
      key: 'hill',
      name: 'Old Hill',
      baseNutrition: 0.36,
      baseRegrowth: 0.008,
      baseDanger: 0.34,
      overgrazing: 0.72,
      colorA: '#b8b072',
      colorB: '#a09563',
      labelX: 2050,
      labelY: 1340,
      describeFood: 'Lean food',
      describeDanger: 'watchful danger',
    },
  };

  const DISCOVERY_DATA = [
    { name: 'Salt Lick', kind: 1, biome: 'hill', x: 1900, y: 1370, effectText: 'The flock feeds deeper from every bite.', apply: e => { e.feedBonus += 0.08; } },
    { name: 'Old Oak', kind: 2, biome: 'clover', x: 1180, y: 430, effectText: 'The flock settles under its shade.', apply: e => { e.nightRiskMod += 0.03; } },
    { name: 'Stone Circle', kind: 3, biome: 'hill', x: 2210, y: 1170, effectText: 'The hill yields stranger paths to hidden places.', apply: e => { e.discoveryRadius += 18; } },
    { name: 'Hidden Clover Patch', kind: 0, biome: 'clover', x: 960, y: 630, effectText: 'Clover country grows sweeter.', apply: e => { e.cloverNutritionBonus += 0.12; } },
    { name: 'Abandoned Gate', kind: 3, biome: 'home', x: 720, y: 640, effectText: 'The pen feels sturdier at dusk.', apply: e => { e.gateSafety += 0.08; } },
    { name: 'Spring Water', kind: 1, biome: 'stream', x: 1460, y: 1260, effectText: 'Wet ground greens faster by the stream.', apply: e => { e.streamRegrowthBonus += 0.006; } },
    { name: 'Fox Den', kind: 0, biome: 'forest', x: 2250, y: 720, effectText: 'Small shapes watch the lambs.', apply: e => { e.lambRiskMod += 0.08; } },
    { name: 'Shepherd’s Bell', kind: 3, biome: 'hill', x: 1750, y: 1500, effectText: 'A bell-call carries farther home.', apply: e => { e.homeCallStrength += 0.22; } },
  ];

  let grass = [];
  let explored = new Set();
  let sheep = [];
  let wolves = [];
  let discoveries = [];
  let discoveredNames = new Set();
  let particles = [];

  let stats = {};
  let effects = {};
  let nightEvents = {};
  let view = { x: 0, y: 0, scale: 1 };
  let pointer = { active: false, x: HOME_CENTER.x, y: HOME_CENTER.y, biomeKey: 'home' };
  let input = { down: false, moved: false, holding: false, startX: 0, startY: 0, downTime: 0, holdTriggered: false };
  let paused = false;
  let started = false;
  let phase = 'title';
  let seasonState = 'title';
  let day = 1;
  let dayTimer = 0;
  let nightTimer = 0;
  let currentToast = 'Tap or drag to guide the flock.';
  let selectedSheepId = null;
  let uid = 0;
  let lastHomeTap = 0;
  let audioCtx = null;
  let duskHowlPlayed = false;
  let flockAlert = 0;
  let wolfWarning = 0;
  let continueMode = false;
  let journal = [];

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

  function resetGame() {
    grass = [];
    explored = new Set();
    sheep = [];
    wolves = [];
    discoveries = [];
    discoveredNames = new Set();
    particles = [];
    journal = [];
    stats = {
      births: 0,
      losses: 0,
      exploredPct: 0,
      daysSurvived: 0,
    };
    effects = {
      feedBonus: 0,
      nightRiskMod: 0,
      discoveryRadius: 0,
      cloverNutritionBonus: 0,
      streamRegrowthBonus: 0,
      gateSafety: 0,
      lambRiskMod: 0,
      homeCallStrength: 0,
    };
    nightEvents = { lost: [], born: [], gateProtected: false, summary: '' };
    paused = false;
    started = false;
    phase = 'title';
    seasonState = 'title';
    day = 1;
    dayTimer = 0;
    nightTimer = 0;
    currentToast = 'Tap or drag to guide the flock.';
    selectedSheepId = null;
    lastHomeTap = 0;
    duskHowlPlayed = false;
    flockAlert = 0;
    wolfWarning = 0;
    continueMode = false;
    HOME.gateOpen = true;
    pointer = { active: false, x: HOME_CENTER.x, y: HOME_CENTER.y, biomeKey: 'home' };
    input = { down: false, moved: false, holding: false, startX: 0, startY: 0, downTime: 0, holdTriggered: false };

    makeWorld();
    makeDiscoveries();
    for (let i = 0; i < START_FLOCK; i++) {
      addSheep(HOME.x + 150 + rng() * 180, HOME.y + 120 + rng() * 110, i < 2 ? 'lamb' : 'adult');
    }
    for (let i = 0; i < 3; i++) spawnWolf(true);

    UI.start.classList.remove('hidden');
    UI.report.classList.add('hidden');
    UI.end.classList.add('hidden');
    UI.continueMeadow.classList.add('hidden');
    UI.banner.classList.add('hidden');
    UI.sheepCard.classList.add('hidden');
    UI.destinationInfo.classList.add('hidden');
    UI.pause.textContent = 'Pause';
    UI.gate.textContent = 'Gate: Open';
    pushJournal('Spring begins over Home Field.');
    updateUI();
  }

  function makeWorld() {
    const cols = Math.ceil(WORLD.w / WORLD.tile);
    const rows = Math.ceil(WORLD.h / WORLD.tile);
    grass.length = cols * rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x * WORLD.tile + WORLD.tile * 0.5;
        const cy = y * WORLD.tile + WORLD.tile * 0.5;
        const biomeKey = biomeAt(cx, cy);
        const biome = BIOMES[biomeKey];
        const distHome = distance(cx, cy, HOME_CENTER.x, HOME_CENTER.y);
        const moisture = streamInfluence(cx, cy);
        const forest = forestInfluence(cx, cy);
        const hill = hillInfluence(cx, cy);
        const nutrition = clamp(
          biome.baseNutrition
          + (biomeKey === 'stream' ? moisture * 0.08 : 0)
          + (biomeKey === 'forest' ? forest * 0.06 : 0)
          - (biomeKey === 'hill' ? hill * 0.03 : 0)
          + (rng() - 0.5) * 0.06,
          0.18,
          1.22
        );
        const regrowthRate = clamp(
          biome.baseRegrowth
          + moisture * 0.004
          - forest * 0.001
          + (rng() - 0.5) * 0.0015,
          0.006,
          0.028
        );
        const danger = clamp(
          biome.baseDanger
          + forest * 0.18
          + (distHome / 1600) * 0.1
          + (biomeKey === 'stream' ? 0.04 : 0),
          0.02,
          1
        );

        grass[y * cols + x] = {
          x,
          y,
          cx,
          cy,
          biomeKey,
          nutrition,
          regrowthRate,
          currentGrowth: biomeKey === 'home' ? 0.82 : clamp(0.55 + rng() * 0.4, 0.3, 1),
          overgrazed: 0,
          grazingPressure: 0,
          danger,
          distHome,
        };
      }
    }
  }

  function makeDiscoveries() {
    discoveries = DISCOVERY_DATA.map(item => ({
      ...item,
      found: false,
      radius: 88,
    }));
  }

  function biomeAt(x, y) {
    if (x < 860 && y < 760) return 'home';
    if (distance(x, y, 1180, 510) < 360) return 'clover';
    if (distance(x, y, 1490, 1180) < 300 || Math.abs(y - 1120) < 150 && x > 1180 && x < 1820) return 'stream';
    if (x > 1740 && y < 980) return 'forest';
    if (distance(x, y, 2060, 1360) < 420) return 'hill';
    if (x > 1320 && y < 760) return 'clover';
    if (x > 1680 && y > 1080) return 'hill';
    return 'home';
  }

  function streamInfluence(x, y) {
    const horizontal = clamp(1 - Math.abs(y - 1120) / 260, 0, 1) * clamp(1 - Math.abs(x - 1500) / 520, 0, 1);
    const spring = clamp(1 - distance(x, y, 1460, 1260) / 240, 0, 1);
    return clamp(horizontal + spring * 0.8, 0, 1);
  }

  function forestInfluence(x, y) {
    const edge = clamp(1 - distance(x, y, 2160, 610) / 540, 0, 1);
    return edge;
  }

  function hillInfluence(x, y) {
    return clamp(1 - distance(x, y, 2050, 1360) / 520, 0, 1);
  }

  function seasonIndexForDay(value) {
    return Math.floor(((value - 1) % 12) / 3);
  }

  function currentSeason() {
    return SEASON_PHASES[seasonIndexForDay(day)];
  }

  function seasonForBirthDay(birthDay) {
    return SEASON_PHASES[seasonIndexForDay(birthDay)];
  }

  function currentDayLength() {
    const season = currentSeason();
    if (season === 'Summer') return DAY_LENGTH + 12;
    if (season === 'Winter') return DAY_LENGTH - 10;
    if (season === 'Spring') return DAY_LENGTH + 4;
    return DAY_LENGTH - 2;
  }

  function currentNightLength() {
    const season = currentSeason();
    if (season === 'Winter') return NIGHT_LENGTH + 8;
    if (season === 'Summer') return NIGHT_LENGTH - 3;
    return NIGHT_LENGTH;
  }

  function seasonGrowthMultiplier() {
    const season = currentSeason();
    if (season === 'Spring') return 1.3;
    if (season === 'Summer') return 1.05;
    if (season === 'Autumn') return 0.82;
    return 0.56;
  }

  function seasonBirthMultiplier() {
    const season = currentSeason();
    if (season === 'Spring') return 1.32;
    if (season === 'Summer') return 1;
    if (season === 'Autumn') return 0.76;
    return 0.38;
  }

  function seasonStarvationRisk() {
    const season = currentSeason();
    if (season === 'Winter') return 0.12;
    if (season === 'Autumn') return 0.04;
    return 0;
  }

  function addSheep(x, y, age = 'adult', mother = null) {
    const lamb = age === 'lamb';
    const trait = mother && mother.trait === 'Motherly' && rng() < 0.35
      ? 'Loyal'
      : TRAITS[Math.floor(rng() * TRAITS.length)];
    const s = {
      id: `s${uid++}`,
      name: sheepName(),
      trait,
      traitLabel: trait,
      age,
      birthDay: day,
      bornSeason: seasonForBirthDay(day),
      x,
      y,
      vx: 0,
      vy: 0,
      size: lamb ? 0.72 : 1,
      hunger: lamb ? 0.76 : 0.88,
      curiosity: rng(),
      courage: rng(),
      stamina: 0.74 + rng() * 0.26,
      homeBias: 0.48 + rng() * 0.16,
      life: lamb ? 0 : 3 + rng() * 7,
      alive: true,
      motherId: mother ? mother.id : null,
      parentName: mother ? mother.name : 'Unknown',
      flash: 0,
      panic: 0,
      panicState: 'calm',
      lostTimer: 0,
      causeOfLoss: '',
      lossSite: '',
    };
    applyTraitStats(s);
    sheep.push(s);
    return s;
  }

  function sheepName() {
    const bits = ['Moss', 'Nettle', 'Pip', 'Bracken', 'Cloud', 'Button', 'Fern', 'Pebble', 'Wisp', 'Clover', 'Bramble', 'Pearl', 'Sorrel', 'Thistle', 'Juniper'];
    return bits[Math.floor(rng() * bits.length)];
  }

  function applyTraitStats(s) {
    if (s.trait === 'Curious') s.curiosity = clamp(s.curiosity + 0.28, 0, 1);
    if (s.trait === 'Timid') s.courage = clamp(s.courage - 0.24, 0, 1);
    if (s.trait === 'Greedy') s.hunger = clamp(s.hunger - 0.08, 0, 1);
    if (s.trait === 'Loyal') s.homeBias += 0.24;
    if (s.trait === 'Hardy') s.stamina = clamp(s.stamina + 0.18, 0, 1.35);
    if (s.trait === 'Motherly') s.courage = clamp(s.courage + 0.08, 0, 1);
  }

  function sheepAgeDays(s) {
    const dayProgress = phase === 'day' ? dayTimer / currentDayLength() : 1;
    return Math.max(0, (day - s.birthDay) + dayProgress);
  }

  function lifeStage(s) {
    const ageDays = sheepAgeDays(s);
    if (ageDays < 1.8) return 'Lamb';
    if (ageDays < 4.5) return 'Young';
    if (ageDays < 9) return 'Adult';
    return 'Elder';
  }

  function ageSpeedMultiplier(s) {
    const stage = lifeStage(s);
    if (stage === 'Lamb') return 0.78;
    if (stage === 'Young') return 1.06;
    if (stage === 'Elder') return 0.84;
    return 1;
  }

  function ageHungerMultiplier(s) {
    const stage = lifeStage(s);
    if (stage === 'Lamb') return 1.18;
    if (stage === 'Young') return 1.02;
    if (stage === 'Elder') return 1.12;
    return 1;
  }

  function ageNightRiskModifier(s) {
    const stage = lifeStage(s);
    if (stage === 'Lamb') return 0.12;
    if (stage === 'Young') return -0.02;
    if (stage === 'Elder') return 0.09;
    return 0;
  }

  function breedingEligible(s) {
    return s.alive && lifeStage(s) === 'Adult';
  }

  function spawnWolf(edge = false) {
    let x;
    let y;
    if (edge) {
      const spawn = [
        { x: 2380 + rng() * 160, y: 220 + rng() * 720 },
        { x: 1860 + rng() * 500, y: -60 + rng() * 120 },
        { x: 2460 + rng() * 100, y: 480 + rng() * 760 },
      ][Math.floor(rng() * 3)];
      x = spawn.x;
      y = spawn.y;
    } else {
      x = 1960 + rng() * 420;
      y = 320 + rng() * 560;
    }
    wolves.push({ x, y, vx: 0, vy: 0, active: false, cooldown: 0 });
  }

  function screenToWorld(sx, sy) {
    return { x: sx / view.scale + view.x, y: sy / view.scale + view.y };
  }

  function setPointerTarget(sx, sy) {
    const w = screenToWorld(sx, sy);
    pointer.x = clamp(w.x, 24, WORLD.w - 24);
    pointer.y = clamp(w.y, 24, WORLD.h - 24);
    pointer.active = true;
    pointer.biomeKey = biomeAt(pointer.x, pointer.y);
    showDestinationInfo(pointer.x, pointer.y);
  }

  function pointerStart(e) {
    if (!started || seasonState === 'ended') return;
    ensureAudio();
    input.down = true;
    input.moved = false;
    input.holding = false;
    input.holdTriggered = false;
    input.startX = e.clientX;
    input.startY = e.clientY;
    input.downTime = performance.now();
  }

  function pointerMove(e) {
    if (!started || !input.down || phase !== 'day') return;
    const dist = Math.hypot(e.clientX - input.startX, e.clientY - input.startY);
    if (!input.holdTriggered && performance.now() - input.downTime > 220) {
      input.holdTriggered = true;
      input.holding = true;
      toast('Hold and drag to tighten the flock.');
    }
    if (dist > 8) {
      input.moved = true;
      setPointerTarget(e.clientX, e.clientY);
    }
  }

  function pointerEnd(e) {
    if (!started || seasonState === 'ended') return;
    if (!input.moved && !input.holding && phase === 'day') {
      const hit = pickSheep(e.clientX, e.clientY);
      if (hit) {
        selectedSheepId = hit.id;
        UI.sheepCard.classList.remove('hidden');
        renderSheepCard();
      } else {
        selectedSheepId = null;
        UI.sheepCard.classList.add('hidden');
        setPointerTarget(e.clientX, e.clientY);
      }
    }
    input.holding = false;
    input.down = false;
  }

  canvas.addEventListener('pointerdown', pointerStart);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', () => {
    input.down = false;
    input.holding = false;
  });

  UI.home.onclick = () => {
    if (!started || seasonState === 'ended') return;
    ensureAudio();
    const now = performance.now();
    const emergency = now - lastHomeTap < 330;
    lastHomeTap = now;
    pointer.x = HOME_CENTER.x;
    pointer.y = HOME_CENTER.y;
    pointer.active = true;
    pointer.biomeKey = 'home';
    showDestinationInfo(pointer.x, pointer.y);
    if (emergency) {
      input.holding = true;
      flockAlert = Math.max(flockAlert, 0.8);
      toast('Emergency recall. The whole flock bunches hard for home.');
    } else {
      toast('The bell rings. The flock turns for home.');
    }
  };

  UI.gate.onclick = () => {
    if (!started || seasonState === 'ended' || phase === 'night') return;
    HOME.gateOpen = !HOME.gateOpen;
    UI.gate.textContent = `Gate: ${HOME.gateOpen ? 'Open' : 'Closed'}`;
    toast(HOME.gateOpen ? 'The gate is open.' : 'The gate is closed. Sheep inside are safer.');
  };

  UI.pause.onclick = () => {
    if (!started || seasonState === 'ended') return;
    paused = !paused;
    UI.pause.textContent = paused ? 'Resume' : 'Pause';
  };

  UI.cont.onclick = () => startNextDay();
  UI.begin.onclick = () => beginSeason();
  UI.restart.onclick = () => resetGame();
  UI.continueMeadow.onclick = () => {
    continueMode = true;
    seasonState = 'active';
    UI.end.classList.add('hidden');
    phase = 'report';
    pushJournal('Continue Meadow begins.');
    startNextDay();
  };
  UI.closeCard.onclick = () => {
    selectedSheepId = null;
    UI.sheepCard.classList.add('hidden');
  };

  function beginSeason() {
    started = true;
    phase = 'day';
    seasonState = 'active';
    day = 1;
    dayTimer = 0;
    nightTimer = 0;
    pointer.active = true;
    pointer.x = HOME_CENTER.x;
    pointer.y = HOME_CENTER.y;
    pointer.biomeKey = 'home';
    UI.start.classList.add('hidden');
    UI.destinationInfo.classList.remove('hidden');
    showDestinationInfo(pointer.x, pointer.y);
    ensureAudio();
    toast('Day 1. Home grass will thin. Find richer ground and make it back by dusk.');
  }

  function update(dt) {
    if (!started || paused || phase === 'title' || phase === 'report' || seasonState === 'ended') {
      updateUI();
      return;
    }

    const dayLength = currentDayLength();
    const nightLength = currentNightLength();

    if (phase === 'day' && !duskHowlPlayed && dayTimer / dayLength > 0.72) {
      duskHowlPlayed = true;
      playHowl();
      toast('A wolf howls beyond the meadow.');
    }

    if (phase === 'day') {
      dayTimer += dt;
      if (dayTimer >= dayLength) startNight();
    } else if (phase === 'night') {
      nightTimer += dt;
      if (nightTimer >= nightLength) resolveNight();
    }

    updateGrass(dt);
    updateSheep(dt);
    updateWolves(dt);
    updateParticles(dt);
    updateCamera(dt);
    updateDiscoveries();
    updatePrompts();
    updateThreatFeedback(dt);
    updateUI();
    checkSeasonState();
  }

  function updateGrass(dt) {
    const seasonGrowth = seasonGrowthMultiplier();
    for (const g of grass) {
      const biome = BIOMES[g.biomeKey];
      const pressureFade = phase === 'day' ? 0.06 : 0.12;
      g.grazingPressure = Math.max(0, g.grazingPressure - pressureFade * dt);
      const overgrazeRecover = g.biomeKey === 'stream' ? 0.085 : 0.05;
      g.overgrazed = Math.max(0, g.overgrazed - overgrazeRecover * dt);

      let regrowth = g.regrowthRate * seasonGrowth;
      if (g.biomeKey === 'clover') regrowth += effects.cloverNutritionBonus * 0.007;
      if (g.biomeKey === 'stream') regrowth += effects.streamRegrowthBonus;
      if (g.overgrazed > 0.2) regrowth *= 1 - g.overgrazed * 0.55;
      if (phase !== 'day') regrowth *= 0.62;

      g.currentGrowth = clamp(g.currentGrowth + regrowth * dt, 0, 1);

      if (g.biomeKey === 'home' && day >= 3) {
        g.currentGrowth = Math.max(0, g.currentGrowth - 0.002 * dt * (day - 2));
      }

      g.effectiveNutrition = effectiveTileNutrition(g);
      g.effectiveDanger = effectiveTileDanger(g);
      g.isSparse = g.currentGrowth < 0.18 || g.overgrazed > 0.45;
      g.color = tileColor(g, biome);
    }
  }

  function updateSheep(dt) {
    const alive = sheep.filter(s => s.alive);
    const center = flockCenter();
    const spreadNow = flockSpread(alive);
    for (const s of alive) {
      s.life += dt / currentDayLength();
      const stage = lifeStage(s);
      s.age = stage.toLowerCase();
      s.size = stage === 'Lamb' ? 0.72 : stage === 'Young' ? 0.9 : stage === 'Elder' ? 0.96 : 1;

      const tile = tileAt(s.x, s.y);
      const localDanger = tile ? tile.effectiveDanger : 0.2;
      const drain = traitHungerDrain(s) * ageHungerMultiplier(s) * (1 + Math.max(0, localDanger - 0.3) * 0.18 + seasonStarvationRisk());
      s.hunger = clamp(s.hunger - dt * drain * (phase === 'day' ? 1 : 1.5), 0, 1);
      updateSheepPanic(s, alive, center, dt);

      let ax = 0;
      let ay = 0;
      const target = phase === 'night' ? HOME_CENTER : pointer.active ? pointer : HOME_CENTER;
      const lateDay = dayTimer / currentDayLength();
      const returnBias = phase === 'night'
        ? 1.15
        : lateDay > 0.73 ? 0.72 + s.homeBias * 0.32 + effects.homeCallStrength * 0.3 : 0.18 + s.homeBias * 0.08;
      const curiosityBoost = s.trait === 'Curious' ? 0.24 : 0;
      const loyalBoost = s.trait === 'Loyal' ? 0.14 : 0;
      const targetWeightBase = phase === 'day'
        ? 0.34 + s.curiosity * 0.24 + curiosityBoost + loyalBoost + returnBias
        : 0.98 + loyalBoost + effects.homeCallStrength * 0.18;
      const targetWeight = input.holding
        ? targetWeightBase + 0.34 - s.panic * 0.18
        : targetWeightBase - s.panic * 0.22;

      ax += (target.x - s.x) * 0.0018 * targetWeight;
      ay += (target.y - s.y) * 0.0018 * targetWeight;
      const cohesionBoost = input.holding ? 0.00105 + effects.homeCallStrength * 0.00055 : 0;
      ax += (center.x - s.x) * ((s.trait === 'Loyal' ? 0.00125 : 0.00082) + cohesionBoost - s.panic * 0.00042);
      ay += (center.y - s.y) * ((s.trait === 'Loyal' ? 0.00125 : 0.00082) + cohesionBoost - s.panic * 0.00042);

      for (const o of alive) {
        if (o === s) continue;
        const dx = s.x - o.x;
        const dy = s.y - o.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0 && d2 < 900) {
          const f = 0.06 / Math.max(30, d2);
          ax += dx * f;
          ay += dy * f;
        }
      }

      if (s.panicState === 'fleeing' || s.panicState === 'lost') {
        const angle = s.id.charCodeAt(1) + performance.now() * 0.0025;
        ax += Math.cos(angle) * (0.2 + s.panic * 0.4);
        ay += Math.sin(angle) * (0.2 + s.panic * 0.4);
      }

      if (phase === 'day' && s.hunger < 0.92) {
        const best = bestGrassNear(s.x, s.y);
        if (best) {
          const gx = best.cx;
          const gy = best.cy;
          const greed = s.trait === 'Greedy' ? 1.42 : 1;
          const panicPenalty = s.panicState === 'fleeing' ? 0.35 : 1;
          ax += (gx - s.x) * 0.0022 * (1 - s.hunger) * greed * panicPenalty;
          ay += (gy - s.y) * 0.0022 * (1 - s.hunger) * greed * panicPenalty;
        }
      }

      for (const w of wolves) {
        const dx = s.x - w.x;
        const dy = s.y - w.y;
        const d = Math.hypot(dx, dy);
        if (d < 260) {
          const timid = s.trait === 'Timid' ? 1.52 : 1;
          const hardy = s.trait === 'Hardy' ? 0.82 : 1;
          const panic = ((260 - d) / 260) * timid * hardy;
          ax += (dx / Math.max(d, 1)) * panic * 3;
          ay += (dy / Math.max(d, 1)) * panic * 3;
          s.flash = 0.24;
        }
      }

      if (!HOME.gateOpen && intersectsFenceLine(s.x, s.y, s.vx * dt, s.vy * dt)) {
        ax *= -2;
        ay *= -2;
      }

      const maxBase = stage === 'Lamb' ? 55 : stage === 'Young' ? 84 : stage === 'Elder' ? 70 : 78;
      const hardySpeed = s.trait === 'Hardy' ? 1.08 : 1;
      const timidSpeed = s.trait === 'Timid' ? 1.05 : 1;
      const ageSpeed = ageSpeedMultiplier(s);
      const panicSpeed = 1 + s.panic * 0.28;
      const maxSpeed = maxBase * hardySpeed * timidSpeed * ageSpeed * panicSpeed * (0.72 + s.stamina * 0.42) * (s.hunger < 0.16 ? 0.55 : 1);
      s.vx = clamp(s.vx + ax * 68 * dt, -maxSpeed, maxSpeed);
      s.vy = clamp(s.vy + ay * 68 * dt, -maxSpeed, maxSpeed);
      s.vx *= 0.91;
      s.vy *= 0.91;
      s.x = clamp(s.x + s.vx * dt, 14, WORLD.w - 14);
      s.y = clamp(s.y + s.vy * dt, 14, WORLD.h - 14);
      s.flash = Math.max(0, s.flash - dt);
      if (spreadNow > 220 && distance(s.x, s.y, center.x, center.y) > 210) s.lostTimer += dt;
      else s.lostTimer = Math.max(0, s.lostTimer - dt * 1.5);

      graze(s, dt);
      markExplored(s.x, s.y);
    }
  }

  function updateSheepPanic(s, alive, center, dt) {
    const nearestWolfDist = nearestWolfDistance(s.x, s.y);
    const distCenter = distance(s.x, s.y, center.x, center.y);
    const isolated = alive.length > 1 ? clamp((distCenter - 120) / 260, 0, 1) : 1;
    const wolfThreat = clamp((310 - nearestWolfDist) / 310, 0, 1);
    const duskThreat = phase === 'day' ? clamp((dayTimer / currentDayLength() - 0.68) / 0.22, 0, 1) * 0.2 : 0.2;
    let panicTarget = wolfThreat * 0.82 + isolated * 0.34 + duskThreat;
    if (lifeStage(s) === 'Lamb') panicTarget += clamp((350 - nearestWolfDist) / 350, 0, 1) * 0.14;
    if (input.holding) panicTarget -= 0.18 + effects.homeCallStrength * 0.08;
    if (isInsideHome(s.x, s.y) && !HOME.gateOpen) panicTarget -= 0.22;
    if (s.trait === 'Timid') panicTarget += 0.1;
    if (s.trait === 'Hardy') panicTarget -= 0.08;
    s.panic += (clamp(panicTarget, 0, 1) - s.panic) * Math.min(1, dt * 4.2);

    if (s.lostTimer > 1.6 || (distCenter > 290 && nearestWolfDist < 270)) s.panicState = 'lost';
    else if (s.panic > 0.72) s.panicState = 'fleeing';
    else if (s.panic > 0.46) s.panicState = 'scared';
    else if (s.panic > 0.2) s.panicState = 'alert';
    else s.panicState = 'calm';
  }

  function traitHungerDrain(s) {
    let drain = 0.018 * (lifeStage(s) === 'Lamb' ? 1.2 : 1);
    if (s.trait === 'Greedy') drain *= 1.12;
    if (s.trait === 'Hardy') drain *= 0.88;
    if (s.trait === 'Timid') drain *= 1.05;
    return drain;
  }

  function bestGrassNear(x, y) {
    const tx = Math.floor(x / WORLD.tile);
    const ty = Math.floor(y / WORLD.tile);
    const cols = Math.ceil(WORLD.w / WORLD.tile);
    let best = null;
    let score = -Infinity;
    for (let yy = ty - 2; yy <= ty + 2; yy++) {
      if (yy < 0 || yy >= Math.ceil(WORLD.h / WORLD.tile)) continue;
      for (let xx = tx - 2; xx <= tx + 2; xx++) {
        if (xx < 0 || xx >= cols) continue;
        const tile = grass[yy * cols + xx];
        if (!tile) continue;
        const distPenalty = Math.hypot(tile.cx - x, tile.cy - y) * 0.0007;
        const scoreNow = tile.currentGrowth * tile.effectiveNutrition - tile.effectiveDanger * 0.06 - distPenalty;
        if (scoreNow > score) {
          score = scoreNow;
          best = tile;
        }
      }
    }
    return best;
  }

  function graze(s, dt) {
    if (phase !== 'day') return;
    const tile = tileAt(s.x, s.y);
    if (!tile || tile.currentGrowth < 0.06) return;

    const greed = s.trait === 'Greedy' ? 1.18 : 1;
    const stage = lifeStage(s);
    const bite = dt * 0.12 * (stage === 'Lamb' ? 0.72 : stage === 'Young' ? 0.88 : stage === 'Elder' ? 0.92 : 1) * greed;
    const eaten = Math.min(tile.currentGrowth, bite);
    tile.currentGrowth -= eaten;
    tile.grazingPressure = clamp(tile.grazingPressure + eaten * 1.3 * BIOMES[tile.biomeKey].overgrazing, 0, 2.4);
    tile.overgrazed = clamp(tile.overgrazed + eaten * 0.9 * BIOMES[tile.biomeKey].overgrazing, 0, 1);
    tile.effectiveNutrition = effectiveTileNutrition(tile);

    const hungerGain = eaten * (0.5 + tile.effectiveNutrition * 0.72 + effects.feedBonus);
    s.hunger = clamp(s.hunger + hungerGain, 0, 1);
    if (rng() < dt * 0.9) particles.push({ x: s.x + rand(-8, 8), y: s.y + rand(-5, 8), life: 0.8, c: tile.biomeKey === 'stream' ? '#cfeec5' : '#e6f7b0' });
  }

  function effectiveTileNutrition(tile) {
    let nutrition = tile.nutrition;
    if (tile.biomeKey === 'clover') nutrition += effects.cloverNutritionBonus;
    nutrition -= tile.overgrazed * 0.35;
    if (tile.grazingPressure > 0.45) nutrition -= tile.grazingPressure * 0.08;
    return clamp(nutrition, 0.12, 1.3);
  }

  function effectiveTileDanger(tile) {
    let danger = tile.danger;
    if (tile.biomeKey === 'forest') danger += 0.08;
    if (tile.biomeKey === 'stream') danger += 0.03;
    danger += (tile.distHome / 1600) * 0.08;
    return clamp(danger, 0.02, 1);
  }

  function tileColor(tile, biome) {
    const base = blendColor(biome.colorA, biome.colorB, clamp(tile.effectiveDanger * 0.6 + tile.overgrazed * 0.5, 0, 1));
    if (tile.overgrazed > 0.38 || tile.currentGrowth < 0.14) return blendColor(base, '#7b7448', 0.42);
    if (tile.currentGrowth < 0.3) return blendColor(base, '#8f9355', 0.28);
    return base;
  }

  function updateWolves(dt) {
    const predatorPressure = wolfPressure();
    const flockSize = sheep.filter(s => s.alive).length;
    for (const w of wolves) {
      w.cooldown = Math.max(0, w.cooldown - dt);
      w.active = phase === 'night' || dayTimer > currentDayLength() * 0.7;
      let ax = 0;
      let ay = 0;

      const prey = sheep.filter(s => s.alive && (!isInsideHome(s.x, s.y) || HOME.gateOpen));
      const forestPull = { x: 2140, y: 620 };
      const homeRepel = !HOME.gateOpen && distance(w.x, w.y, HOME_CENTER.x, HOME_CENTER.y) < 360 ? 1.8 : 0;
      ax += (forestPull.x - w.x) * (0.00022 + predatorPressure * 0.00005);
      ay += (forestPull.y - w.y) * (0.00022 + predatorPressure * 0.00005);
      ax += (w.x - HOME_CENTER.x) * 0.00015 * homeRepel;
      ay += (w.y - HOME_CENTER.y) * 0.00015 * homeRepel;

      if (w.active && prey.length) {
        const target = nearest(w, prey, s => {
          const tile = tileAt(s.x, s.y);
          const dangerBias = tile ? tile.effectiveDanger : 0.3;
          const stage = lifeStage(s);
          const lambBias = stage === 'Lamb' ? 0.22 : stage === 'Elder' ? 0.12 : 0;
          const isolatedBias = clamp(distance(s.x, s.y, flockCenter().x, flockCenter().y) / 240, 0, 1) * 0.4;
          const lostBias = s.panicState === 'lost' ? 0.5 : s.panicState === 'fleeing' ? 0.28 : 0;
          return distanceSquared(w.x, w.y, s.x, s.y) / (1 + dangerBias + lambBias + isolatedBias + lostBias);
        });
        if (target) {
          const dx = target.x - w.x;
          const dy = target.y - w.y;
          const d = Math.hypot(dx, dy);
          const boldness = 1.02 + predatorPressure * 0.22 + Math.max(0, flockSize - 8) * 0.018;
          ax += (dx / Math.max(1, d)) * ((1.1 + (tileAt(target.x, target.y)?.effectiveDanger || 0) * 0.45) * boldness);
          ay += (dy / Math.max(1, d)) * ((1.1 + (tileAt(target.x, target.y)?.effectiveDanger || 0) * 0.45) * boldness);
          if (d < 24 && w.cooldown <= 0 && phase === 'night') {
            const tile = tileAt(target.x, target.y);
            const stage = lifeStage(target);
            let risk = stage === 'Lamb' ? 0.72 : stage === 'Elder' ? 0.48 : 0.38;
            risk += tile ? tile.effectiveDanger * 0.18 : 0;
            risk += distance(target.x, target.y, HOME_CENTER.x, HOME_CENTER.y) / 2600 * 0.12;
            risk += predatorPressure * 0.08;
            if (target.trait === 'Timid') risk += 0.08;
            if (target.trait === 'Hardy') risk -= 0.12;
            if (rng() < clamp(risk, 0.08, 0.95)) loseSheep(target, 'wolf');
            w.cooldown = 4.5;
          }
        }
      } else {
        ax += Math.sin(performance.now() * 0.0002 + w.x) * 0.2;
        ay += Math.cos(performance.now() * 0.0002 + w.y) * 0.2;
      }

      const max = w.active ? 112 + predatorPressure * 10 + Math.max(0, flockSize - 8) * 1.2 : 36;
      w.vx = clamp((w.vx + ax * 90 * dt) * 0.95, -max, max);
      w.vy = clamp((w.vy + ay * 90 * dt) * 0.95, -max, max);
      w.x = clamp(w.x + w.vx * dt, -120, WORLD.w + 120);
      w.y = clamp(w.y + w.vy * dt, -120, WORLD.h + 120);
    }
  }

  function loseSheep(s, reason) {
    if (!s.alive) return;
    s.alive = false;
    s.causeOfLoss = reason;
    s.lossSite = nearestDiscoveryName(s.x, s.y) || BIOMES[biomeAt(s.x, s.y)].name;
    stats.losses++;
    pushJournal(`${s.name} was lost near ${s.lossSite}.`);
    if (phase === 'night') {
      nightEvents.lost.push({ name: s.name, place: s.lossSite, reason });
    }
    if (selectedSheepId === s.id) {
      selectedSheepId = null;
      UI.sheepCard.classList.add('hidden');
    }
    pop(s.x, s.y, '#d35f4b');
  }

  function resolveNight() {
    phase = 'report';
    stats.daysSurvived = Math.max(stats.daysSurvived, day);

    const alive = sheep.filter(s => s.alive);
    const spread = flockSpread(alive);
    const avgWolfProximity = avg(alive.map(s => clamp((360 - nearestWolfDistance(s.x, s.y)) / 360, 0, 1)));
    const lambCount = alive.filter(s => lifeStage(s) === 'Lamb').length;
    const predatorPressure = wolfPressure();
    for (const s of alive) {
      const tile = tileAt(s.x, s.y);
      const distHome = distance(s.x, s.y, HOME_CENTER.x, HOME_CENTER.y);
      const stage = lifeStage(s);
      let risk = tile ? tile.effectiveDanger * 0.26 : 0.06;
      risk += clamp(distHome / 1900, 0, 1) * 0.22;
      risk += clamp((1 - s.hunger) * 0.36, 0, 0.36);
      risk += clamp(spread / 420, 0, 1) * 0.18;
      risk += avgWolfProximity * 0.16;
      risk += predatorPressure * 0.12;
      risk += seasonStarvationRisk();
      risk += HOME.gateOpen ? 0.14 : -0.07 - effects.gateSafety;
      risk += stage === 'Lamb' ? 0.1 + clamp(distHome / 1700, 0, 1) * 0.12 + effects.lambRiskMod : 0;
      risk += lambCount * 0.008;
      risk += s.panic * 0.14;
      risk += ageNightRiskModifier(s);
      risk -= isInsideHome(s.x, s.y) && !HOME.gateOpen ? 0.14 : 0;
      risk -= effects.nightRiskMod;
      if (s.trait === 'Hardy') risk -= 0.06;
      if (s.trait === 'Timid' && distHome > 700) risk += 0.05;

      if (rng() < clamp(risk, 0.01, 0.93)) loseSheep(s, 'night');
    }

    nightEvents.gateProtected = !HOME.gateOpen && sheep.some(s => s.alive && isInsideHome(s.x, s.y));

    const adults = sheep.filter(s => breedingEligible(s) && s.hunger > 0.62 && isInsideHome(s.x, s.y));
    const mothers = adults.filter(s => s.trait === 'Motherly');
    if (adults.length >= 4) {
      const birthChance = clamp(((adults.length - 3) * 0.06 + avg(adults.map(s => s.hunger)) * 0.08 + mothers.length * 0.04) * seasonBirthMultiplier(), 0, 0.68);
      if (rng() < birthChance) {
        const count = rng() < 0.18 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          const mother = mothers.length && rng() < 0.7
            ? mothers[Math.floor(rng() * mothers.length)]
            : adults[Math.floor(rng() * adults.length)];
          const lamb = addSheep(mother.x + rand(-16, 16), mother.y + rand(-16, 16), 'lamb', mother);
          nightEvents.born.push({ name: lamb.name, mother: mother.name });
          stats.births++;
          pushJournal(`${lamb.name} was born to ${mother.name}.`);
        }
      }
    }

    UI.nightText.textContent = buildNightText();
    UI.report.classList.remove('hidden');
    checkSeasonState(true);
  }

  function buildNightText() {
    const lines = [];
    if (nightEvents.lost.length) {
      lines.push(
        `${nightEvents.lost.slice(0, 2).map(item => `${item.name}${item.place ? ` near ${item.place}` : ''}`).join(', ')} faded into the dark.`
      );
    } else {
      lines.push('No names were taken by the dark.');
    }

    if (nightEvents.born.length) {
      lines.push(
        `${nightEvents.born.slice(0, 2).map(item => `${item.name} from ${item.mother}`).join(', ')} arrived before dawn.`
      );
    } else {
      lines.push('No lamb cried in the pen tonight.');
    }

    lines.push(nightEvents.gateProtected ? 'The closed gate held.' : 'The night found every open edge.');
    return lines.join(' ');
  }

  function startNight() {
    phase = 'night';
    nightTimer = 0;
    HOME.gateOpen = false;
    nightEvents = { lost: [], born: [], gateProtected: false, summary: '' };
    UI.gate.textContent = 'Gate: Closed';
    pointer.x = HOME_CENTER.x;
    pointer.y = HOME_CENTER.y;
    pointer.biomeKey = 'home';
    input.holding = false;
    toast('Night is coming. Distance, hunger, and a scattered flock now matter.');
    const desiredWolves = 3 + Math.floor(day / 3) + Math.floor(Math.max(0, sheep.filter(s => s.alive).length - 8) / 4);
    while (wolves.length < desiredWolves) spawnWolf(true);
  }

  function startNextDay() {
    if (day >= SEASON_DAYS && !continueMode) {
      endSeason('complete');
      return;
    }
    const previousSeason = currentSeason();
    day++;
    dayTimer = 0;
    nightTimer = 0;
    duskHowlPlayed = false;
    phase = 'day';
    HOME.gateOpen = true;
    UI.gate.textContent = 'Gate: Open';
    UI.report.classList.add('hidden');
    input.holding = false;
    for (const s of sheep) {
      if (s.alive) s.hunger = clamp(s.hunger + 0.06, 0, 1);
    }
    wolves.length = Math.min(wolves.length, 3 + Math.floor(day / 2) + Math.floor(Math.max(0, sheep.filter(s => s.alive).length - 8) / 5));
    toast(day < 4
      ? `Day ${day}. Home still holds, but richer ground waits beyond it.`
      : `Day ${day}. Home grass will not carry a larger flock now.`);
    if (currentSeason() !== previousSeason) {
      pushJournal(`${currentSeason()} settles over the meadow.`);
      toast(`${currentSeason()} settles over the meadow.`);
    }
    showDestinationInfo(pointer.x, pointer.y);
  }

  function updateCamera(dt) {
    const c = flockCenter();
    const targetX = clamp(c.x - innerWidth / view.scale / 2, 0, WORLD.w - innerWidth / view.scale);
    const targetY = clamp(c.y - innerHeight / view.scale / 2, 0, WORLD.h - innerHeight / view.scale);
    view.x += (targetX - view.x) * Math.min(1, dt * 2.8);
    view.y += (targetY - view.y) * Math.min(1, dt * 2.8);
  }

  function updateDiscoveries() {
    const radiusBonus = effects.discoveryRadius;
    for (const feature of discoveries) {
      if (feature.found) continue;
      const near = sheep.some(s => s.alive && distance(s.x, s.y, feature.x, feature.y) < feature.radius + radiusBonus);
      if (near) {
        feature.found = true;
        discoveredNames.add(feature.name);
        feature.apply(effects);
        pop(feature.x, feature.y, '#fff0a6');
        pushJournal(`Discovery: ${feature.name}.`);
        toast(`Discovered: ${feature.name}. ${feature.effectText}`);
      }
    }
  }

  function updateParticles(dt) {
    for (const p of particles) p.life -= dt;
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
  }

  function updatePrompts() {
    if (phase !== 'day') {
      UI.banner.classList.add('hidden');
      return;
    }

    const t = dayTimer / currentDayLength();
    const averageHome = avgBiomeGrowth('home');
    if (flockAlert > 0.55) {
      UI.banner.classList.remove('hidden');
      UI.warningText.textContent = 'Flock is scattered.';
    } else if (wolfWarning > 0.42) {
      UI.banner.classList.remove('hidden');
      UI.warningText.textContent = 'Wolves are near.';
    } else if (t > 0.74) {
      UI.banner.classList.remove('hidden');
      UI.warningText.textContent = 'Return home before night.';
    } else if (day >= 3 && averageHome < 0.34) {
      UI.banner.classList.remove('hidden');
      UI.warningText.textContent = 'Home grass is thinning. Travel for richer feed.';
    } else {
      UI.banner.classList.add('hidden');
    }
  }

  function updateUI() {
    const alive = sheep.filter(s => s.alive);
    const lambs = alive.filter(s => lifeStage(s) === 'Lamb').length;
    const fed = Math.round(avg(alive.map(s => s.hunger)) * 100) || 0;
    const exploredPct = Math.round((explored.size / (Math.ceil(WORLD.w / 110) * Math.ceil(WORLD.h / 110))) * 100);
    stats.exploredPct = clamp(exploredPct, 0, 100);

    UI.day.textContent = `Day ${day}/${SEASON_DAYS}`;
    UI.season.textContent = continueMode ? `${currentSeason()} · Continue Meadow` : currentSeason();
    UI.time.textContent = phase === 'day' ? dayName(dayTimer / currentDayLength()) : phase === 'night' ? 'Night' : 'Dawn';
    UI.sheep.textContent = alive.length;
    UI.lambs.textContent = lambs;
    UI.food.textContent = `${fed}%`;
    UI.explore.textContent = `${stats.exploredPct}%`;
    UI.toast.textContent = currentToast;
    renderSheepCard();
    renderJournal();
  }

  function renderSheepCard() {
    if (!selectedSheepId) return;
    const s = sheep.find(item => item.id === selectedSheepId && item.alive);
    if (!s) {
      selectedSheepId = null;
      UI.sheepCard.classList.add('hidden');
      return;
    }
    UI.sheepName.textContent = s.name;
    UI.sheepTrait.textContent = `${s.traitLabel} trait`;
    UI.sheepAge.textContent = `${lifeStage(s)}, day ${Math.max(1, Math.floor(sheepAgeDays(s)) + 1)}`;
    UI.sheepHunger.textContent = `${Math.round(s.hunger * 100)}%`;
    UI.sheepParent.textContent = s.parentName || 'Unknown';
    UI.sheepSeason.textContent = s.bornSeason;
    UI.sheepStatus.textContent = sheepStatus(s);
    UI.sheepCard.classList.remove('hidden');
  }

  function sheepStatus(s) {
    if (phase !== 'day' && isInsideHome(s.x, s.y) && !HOME.gateOpen) return 'Safe at home';
    if (s.panicState === 'lost') return 'Lost';
    if (s.panicState === 'fleeing') return 'Fleeing';
    if (s.panicState === 'scared') return 'Scared';
    if (s.panicState === 'alert') return 'Alert';
    if (s.hunger < 0.18) return 'Starving';
    if (s.hunger < 0.36) return 'Hungry';
    return 'Calm';
  }

  function showDestinationInfo(x, y) {
    const biome = BIOMES[biomeAt(x, y)];
    const tile = tileAt(x, y);
    const distanceLabel = Math.round(distance(x, y, HOME_CENTER.x, HOME_CENTER.y) / 100);
    UI.destinationTitle.textContent = biome.name;
    UI.destinationText.textContent = `${biome.name} — ${foodLabel(tile?.effectiveNutrition ?? biome.baseNutrition)}, ${dangerLabel(tile?.effectiveDanger ?? biome.baseDanger)}, ${distanceLabel} fields from home.`;
    UI.destinationInfo.classList.remove('hidden');
  }

  function foodLabel(value) {
    if (value > 0.92) return 'rich food';
    if (value > 0.68) return 'good food';
    if (value > 0.48) return 'fair food';
    return 'lean food';
  }

  function dangerLabel(value) {
    if (value > 0.62) return 'high danger';
    if (value > 0.34) return 'moderate danger';
    return 'low danger';
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
    drawBiomeLabels();
    drawDiscoveries();
    drawHome();
    drawGuidance();
    for (const w of wolves) drawWolf(w);
    for (const s of sheep) if (s.alive) drawSheep(s);
    drawParticles();
    drawVignette();
    ctx.restore();
    drawScreenWarnings();
  }

  function drawGround() {
    const dusk = dayTimer > currentDayLength() * 0.72;
    const sky = phase === 'night' ? '#283152' : dusk ? '#93b96e' : '#9fcf7a';
    ctx.fillStyle = sky;
    ctx.fillRect(view.x, view.y, innerWidth / view.scale, innerHeight / view.scale);

    const startX = Math.floor(view.x / WORLD.tile) - 1;
    const endX = Math.ceil((view.x + innerWidth / view.scale) / WORLD.tile) + 1;
    const startY = Math.floor(view.y / WORLD.tile) - 1;
    const endY = Math.ceil((view.y + innerHeight / view.scale) / WORLD.tile) + 1;
    const cols = Math.ceil(WORLD.w / WORLD.tile);
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || y < 0 || x >= cols || y >= Math.ceil(WORLD.h / WORLD.tile)) continue;
        const tile = grass[y * cols + x];
        if (!tile) continue;

        ctx.fillStyle = tile.color;
        ctx.fillRect(x * WORLD.tile, y * WORLD.tile, WORLD.tile + 1, WORLD.tile + 1);

        if (tile.currentGrowth > 0.18) {
          ctx.fillStyle = tile.biomeKey === 'stream' ? 'rgba(234,255,243,0.2)' : 'rgba(255,255,220,0.18)';
          for (let i = 0; i < 3; i++) {
            const px = x * WORLD.tile + ((i * 17 + x * 11 + y * 7) % WORLD.tile);
            const py = y * WORLD.tile + ((i * 13 + y * 19 + x * 3) % WORLD.tile);
            const height = tile.overgrazed > 0.35 ? 2 : 5;
            ctx.fillRect(px, py, 3, height);
          }
        }

        if (tile.biomeKey === 'stream' && streamInfluence(tile.cx, tile.cy) > 0.42) {
          ctx.fillStyle = 'rgba(214, 247, 255, 0.26)';
          ctx.fillRect(x * WORLD.tile + 6, y * WORLD.tile + 6, WORLD.tile - 18, 4);
        }
      }
    }

    if (phase === 'day' && dayTimer / currentDayLength() > 0.78) {
      const tint = clamp((dayTimer / currentDayLength() - 0.78) / 0.22, 0, 1) * 0.16;
      ctx.fillStyle = `rgba(184, 96, 49, ${tint})`;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    }

    ctx.strokeStyle = 'rgba(35,55,30,0.24)';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, WORLD.w - 8, WORLD.h - 8);
  }

  function drawBiomeLabels() {
    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    for (const biome of Object.values(BIOMES)) {
      ctx.fillStyle = 'rgba(31, 45, 25, 0.5)';
      ctx.fillText(biome.name, biome.labelX, biome.labelY + 1);
      ctx.fillStyle = 'rgba(255, 248, 226, 0.68)';
      ctx.fillText(biome.name, biome.labelX, biome.labelY);
    }
  }

  function drawDiscoveries() {
    for (const f of discoveries) {
      if (!f.found && distance(flockCenter().x, flockCenter().y, f.x, f.y) > 440) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.globalAlpha = f.found ? 1 : 0.24;
      if (f.kind === 0) {
        ctx.fillStyle = '#467c35';
        ctx.fillRect(-15, -15, 30, 30);
        ctx.fillStyle = '#f4e6b0';
        ctx.fillRect(-4, -4, 8, 8);
      }
      if (f.kind === 1) {
        ctx.fillStyle = '#d8d2bf';
        ctx.fillRect(-18, 5, 36, 10);
        ctx.fillRect(-9, -12, 18, 18);
      }
      if (f.kind === 2) {
        ctx.fillStyle = '#5b3c22';
        ctx.fillRect(-6, -28, 12, 42);
        ctx.fillStyle = '#3d7f3a';
        ctx.fillRect(-30, -48, 60, 34);
      }
      if (f.kind === 3) {
        ctx.fillStyle = '#6f7780';
        ctx.fillRect(-24, -12, 12, 32);
        ctx.fillRect(12, -12, 12, 32);
        ctx.fillRect(-18, -24, 36, 10);
      }
      if (f.found) {
        ctx.fillStyle = 'rgba(20,32,19,0.72)';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(f.name, 0, 38);
      }
      ctx.restore();
    }
  }

  function drawHome() {
    ctx.fillStyle = 'rgba(255, 247, 198, 0.13)';
    ctx.fillRect(HOME.x, HOME.y, HOME.w, HOME.h);
    ctx.strokeStyle = '#6d4f2b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(HOME.x, HOME.y);
    ctx.lineTo(HOME.x + HOME.w, HOME.y);
    ctx.lineTo(HOME.x + HOME.w, HOME.gateY - 34);
    if (!HOME.gateOpen) ctx.lineTo(HOME.x + HOME.w, HOME.gateY + 34);
    else ctx.moveTo(HOME.x + HOME.w, HOME.gateY + 34);
    ctx.lineTo(HOME.x + HOME.w, HOME.y + HOME.h);
    ctx.lineTo(HOME.x, HOME.y + HOME.h);
    ctx.lineTo(HOME.x, HOME.y);
    ctx.stroke();

    ctx.fillStyle = HOME.gateOpen ? '#f0c169' : '#7b5630';
    ctx.fillRect(HOME.x + HOME.w - 10, HOME.gateY - 36, 20, 72);
    ctx.fillStyle = '#5f4327';
    ctx.fillRect(HOME.x + 26, HOME.y + 22, 70, 48);
    ctx.fillStyle = '#e9d391';
    ctx.fillRect(HOME.x + 36, HOME.y + 31, 50, 30);
  }

  function drawGuidance() {
    if (!pointer.active || phase !== 'day') return;
    const center = flockCenter();
    ctx.save();
    ctx.strokeStyle = input.holding
      ? 'rgba(255, 236, 174, 0.74)'
      : dayTimer / currentDayLength() > 0.74 ? 'rgba(209, 114, 61, 0.62)' : 'rgba(255,255,255,0.42)';
    ctx.lineWidth = input.holding ? 5 : 4;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(pointer.x, pointer.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 18 + Math.sin(performance.now() / 180) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = input.holding
      ? 'rgba(255, 236, 174, 0.36)'
      : dayTimer / currentDayLength() > 0.74 ? 'rgba(209, 114, 61, 0.28)' : 'rgba(20,32,19,0.2)';
    ctx.fillRect(pointer.x - 4, pointer.y - 4, 8, 8);
    ctx.restore();
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

    if (selectedSheepId === s.id) {
      ctx.strokeStyle = 'rgba(255, 238, 174, 0.95)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22 * s.size, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(23, 33, 28, 0.12)';
    ctx.fillRect(-9 * sc, 8 * sc, 18 * sc, 5 * sc);

    ctx.fillStyle = s.flash > 0 ? '#ffe2e2' : lifeStage(s) === 'Lamb' ? '#fff9e7' : '#f8f4e8';
    px(-9, -6, 18, 13, sc);
    px(-6, -10, 12, 7, sc);
    ctx.fillStyle = '#e7dfcc';
    px(-7, 4, 14, 4, sc);
    ctx.fillStyle = '#2b2b2b';
    px(8, -4, 6, 7, sc);
    ctx.fillStyle = '#111';
    px(11, -2, 1.5, 1.5, sc);
    ctx.fillStyle = '#393939';
    px(9, -8, 3, 4, sc);
    px(9, 3, 3, 4, sc);
    ctx.fillStyle = '#3d302a';
    px(-7, 7 + walk, 3, 7, sc);
    px(2, 7 - walk, 3, 7, sc);
    if (s.panicState !== 'calm') {
      ctx.rotate(-dir);
      ctx.fillStyle = s.panicState === 'lost' ? '#ff7866' : '#fff2b0';
      ctx.fillRect(-2, -24 * s.size, 4, 10);
      if (s.panicState === 'scared' || s.panicState === 'fleeing' || s.panicState === 'lost') {
        ctx.fillRect(-2, -10 * s.size, 4, 4);
      }
    }
    ctx.restore();
  }

  function drawWolf(w) {
    const dir = Math.atan2(w.vy, w.vx) || 0;
    ctx.save();
    ctx.translate(Math.round(w.x), Math.round(w.y));
    ctx.rotate(dir);
    const sc = 2.1;
    ctx.globalAlpha = w.active ? 1 : 0.42;
    ctx.fillStyle = 'rgba(5,10,22,0.18)';
    px(-12, 7, 24, 5, sc);
    ctx.fillStyle = w.active ? '#3c4650' : '#59626d';
    px(-12, -5, 20, 10, sc);
    ctx.fillStyle = w.active ? '#252c33' : '#404852';
    px(5, -8, 10, 9, sc);
    ctx.fillStyle = '#1b2026';
    px(13, -4, 6, 4, sc);
    ctx.fillStyle = '#12161a';
    px(-17, -4, 7, 4, sc);
    ctx.fillStyle = '#f6d36b';
    px(10, -5, 2, 2, sc);
    if (w.active) {
      ctx.fillStyle = 'rgba(255, 215, 130, 0.22)';
      px(-5, 10, 10, 3, sc);
    }
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
    if (phase !== 'night' && dayTimer < currentDayLength() * 0.72) return;
    const darkness = phase === 'night'
      ? 0.48
      : clamp((dayTimer / currentDayLength() - 0.72) / 0.28, 0, 1) * 0.32;
    ctx.fillStyle = `rgba(8, 14, 30, ${darkness})`;
    ctx.fillRect(view.x, view.y, innerWidth / view.scale, innerHeight / view.scale);
  }

  function drawScreenWarnings() {
    if (wolfWarning <= 0.05) return;
    const edge = Math.min(innerWidth, innerHeight) * 0.08;
    const alpha = clamp(wolfWarning, 0, 1) * 0.32;
    const gradTop = ctx.createLinearGradient(0, 0, 0, edge);
    gradTop.addColorStop(0, `rgba(175, 32, 20, ${alpha})`);
    gradTop.addColorStop(1, 'rgba(175, 32, 20, 0)');
    ctx.fillStyle = gradTop;
    ctx.fillRect(0, 0, innerWidth, edge);
    const gradBottom = ctx.createLinearGradient(0, innerHeight, 0, innerHeight - edge);
    gradBottom.addColorStop(0, `rgba(175, 32, 20, ${alpha})`);
    gradBottom.addColorStop(1, 'rgba(175, 32, 20, 0)');
    ctx.fillStyle = gradBottom;
    ctx.fillRect(0, innerHeight - edge, innerWidth, edge);
    const gradLeft = ctx.createLinearGradient(0, 0, edge, 0);
    gradLeft.addColorStop(0, `rgba(175, 32, 20, ${alpha})`);
    gradLeft.addColorStop(1, 'rgba(175, 32, 20, 0)');
    ctx.fillStyle = gradLeft;
    ctx.fillRect(0, 0, edge, innerHeight);
    const gradRight = ctx.createLinearGradient(innerWidth, 0, innerWidth - edge, 0);
    gradRight.addColorStop(0, `rgba(175, 32, 20, ${alpha})`);
    gradRight.addColorStop(1, 'rgba(175, 32, 20, 0)');
    ctx.fillStyle = gradRight;
    ctx.fillRect(innerWidth - edge, 0, edge, innerHeight);
  }

  function pickSheep(sx, sy) {
    const world = screenToWorld(sx, sy);
    let best = null;
    let bestDist = 30;
    for (const s of sheep) {
      if (!s.alive) continue;
      const d = Math.hypot(world.x - s.x, world.y - s.y);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    return best;
  }

  function checkSeasonState(fromNight = false) {
    const alive = sheep.filter(s => s.alive).length;
    if (!alive) {
      stats.daysSurvived = day;
      endSeason('gameover');
      return;
    }
    if (fromNight && day >= SEASON_DAYS && !continueMode) {
      endSeason('complete');
    }
  }

  function endSeason(kind) {
    seasonState = 'ended';
    phase = 'ended';
    UI.report.classList.add('hidden');
    UI.banner.classList.add('hidden');

    const alive = sheep.filter(s => s.alive).length;
    UI.endTitle.textContent = kind === 'complete' ? 'Season Complete' : 'Game Over';
    UI.endText.textContent = kind === 'complete'
      ? 'Ten nights passed. The flock can remain in the meadow if you wish.'
      : 'The meadow fell silent before the season could turn.';
    UI.finalStats.innerHTML = [
      statCell(kind === 'complete' ? SEASON_DAYS : stats.daysSurvived, 'Days survived'),
      statCell(alive, 'Living sheep'),
      statCell(stats.births, 'Lambs born'),
      statCell(stats.losses, 'Sheep lost'),
      statCell(discoveredNames.size, 'Discoveries found'),
      statCell(`${stats.exploredPct}%`, 'Map explored'),
    ].join('');
    UI.continueMeadow.classList.toggle('hidden', kind !== 'complete');
    UI.end.classList.remove('hidden');
    toast(kind === 'complete' ? 'Season complete.' : 'The flock is gone.');
  }

  function pushJournal(text) {
    journal.unshift(text);
    if (journal.length > 8) journal.length = 8;
  }

  function renderJournal() {
    UI.journalEntries.innerHTML = journal.map(entry => `<p>${entry}</p>`).join('');
  }

  function updateThreatFeedback(dt) {
    const alive = sheep.filter(s => s.alive);
    const spread = flockSpread(alive);
    const alertSheep = alive.filter(s => s.panicState !== 'calm').length;
    flockAlert += ((spread > 210 || alive.some(s => s.panicState === 'lost') ? 1 : 0) - flockAlert) * Math.min(1, dt * 3);
    const nearestWolf = nearestWolfDistance(flockCenter().x, flockCenter().y);
    const nearWolfTarget = clamp((450 - nearestWolf) / 450, 0, 1);
    wolfWarning += (nearWolfTarget - wolfWarning) * Math.min(1, dt * 2.8);
    if (phase === 'day' && alertSheep > 0 && wolfWarning > 0.45 && rng() < dt * 0.35) {
      currentToast = alertSheep > 2 ? 'Wolves are worrying the edges of the flock.' : 'A sheep startles at movement in the grass.';
    }
  }

  function wolfPressure() {
    const aliveSheep = sheep.filter(s => s.alive).length;
    return 0.2 + Math.floor((day - 1) / 3) * 0.12 + Math.max(0, aliveSheep - 8) * 0.025;
  }

  function nearestWolfDistance(x, y) {
    if (!wolves.length) return Infinity;
    let best = Infinity;
    for (const wolf of wolves) {
      const d = distance(x, y, wolf.x, wolf.y);
      if (d < best) best = d;
    }
    return best;
  }

  function ensureAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }

  function playHowl() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const lfo = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.9);
    lfo.type = 'sine';
    lfo.frequency.value = 6;
    lfoGain.gain.value = 12;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.012, now + 0.65);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 1.08);
    lfo.stop(now + 1.08);
  }

  function tileAt(x, y) {
    const cols = Math.ceil(WORLD.w / WORLD.tile);
    const tx = clamp(Math.floor(x / WORLD.tile), 0, cols - 1);
    const ty = clamp(Math.floor(y / WORLD.tile), 0, Math.ceil(WORLD.h / WORLD.tile) - 1);
    return grass[ty * cols + tx];
  }

  function avgBiomeGrowth(biomeKey) {
    const tiles = grass.filter(tile => tile.biomeKey === biomeKey);
    return avg(tiles.map(tile => tile.currentGrowth * tile.effectiveNutrition));
  }

  function nearestDiscoveryName(x, y) {
    let best = '';
    let bestDist = Infinity;
    for (const f of discoveries) {
      const d = distance(x, y, f.x, f.y);
      if (d < bestDist) {
        bestDist = d;
        best = f.name;
      }
    }
    return bestDist < 230 ? best : '';
  }

  function flockCenter() {
    const alive = sheep.filter(s => s.alive);
    if (!alive.length) return { x: HOME_CENTER.x, y: HOME_CENTER.y };
    return { x: avg(alive.map(s => s.x)), y: avg(alive.map(s => s.y)) };
  }

  function flockSpread(alive) {
    const center = flockCenter();
    return avg(alive.map(s => distance(s.x, s.y, center.x, center.y)));
  }

  function nearest(from, list, scoreFn = item => distanceSquared(from.x, from.y, item.x, item.y)) {
    let best = null;
    let bestScore = Infinity;
    for (const item of list) {
      const score = scoreFn(item);
      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    }
    return best;
  }

  function isInsideHome(x, y) {
    return x > HOME.x && x < HOME.x + HOME.w && y > HOME.y && y < HOME.y + HOME.h;
  }

  function intersectsFenceLine(x, y, dx, dy) {
    const nx = x + dx;
    const crossedRight = x < HOME.x + HOME.w && nx >= HOME.x + HOME.w && y > HOME.y && y < HOME.y + HOME.h;
    if (!crossedRight) return false;
    return !(y > HOME.gateY - 40 && y < HOME.gateY + 40);
  }

  function markExplored(x, y) {
    explored.add(`${Math.floor(x / 110)},${Math.floor(y / 110)}`);
  }

  function statCell(value, label) {
    return `<div><span>${value}</span><small>${label}</small></div>`;
  }

  function px(x, y, w, h, sc) {
    ctx.fillRect(Math.round(x * sc), Math.round(y * sc), Math.round(w * sc), Math.round(h * sc));
  }

  function pop(x, y, c) {
    for (let i = 0; i < 12; i++) particles.push({ x: x + rand(-12, 12), y: y + rand(-12, 12), life: 0.7 + rng() * 0.5, c });
  }

  function blendColor(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const mix = {
      r: Math.round(ca.r + (cb.r - ca.r) * t),
      g: Math.round(ca.g + (cb.g - ca.g) * t),
      b: Math.round(ca.b + (cb.b - ca.b) * t),
    };
    return `rgb(${mix.r}, ${mix.g}, ${mix.b})`;
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function rand(a, b) {
    return a + rng() * (b - a);
  }

  function avg(arr) {
    return arr.length ? arr.reduce((sum, value) => sum + value, 0) / arr.length : 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
  }

  function distanceSquared(x1, y1, x2, y2) {
    return (x1 - x2) ** 2 + (y1 - y2) ** 2;
  }

  function toast(message) {
    currentToast = message;
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resetGame();
  requestAnimationFrame(loop);
})();
