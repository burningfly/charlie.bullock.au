import Phaser from 'phaser';

const WIDTH = 960;
const HEIGHT = 540;
const WORLD_WIDTH = 2400;
const MAX_BASKET = 6;
const GAME_SLUG = 'reefkeeper';
const SAVE_KEY = 'reefkeeper-save';
const defaults = { day: 1, sharedFish: 0, shells: 0, keepsakeReturned: false, spearGun: false, biggerBasket: false, airTank: false, bestHaul: 0 };
const saved = readSave();
const trip = { air: 100, haul: 0, foundCharm: false, active: false, speaker: 0 };
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let soundEnabled = false;
let audioContext;

const ui = {
  air: document.querySelector('#air-value'), airFill: document.querySelector('#air-fill'),
  haul: document.querySelector('#haul-count'), shells: document.querySelector('#shell-count'),
  phase: document.querySelector('#phase-label'), day: document.querySelector('#day-label'),
  start: document.querySelector('#start-overlay'), night: document.querySelector('#night-overlay'),
  nightDay: document.querySelector('#night-day'), nightTitle: document.querySelector('#night-title'),
  nightMessage: document.querySelector('#night-message'), quest: document.querySelector('#quest-note'),
  toast: document.querySelector('#toast'), hint: document.querySelector('#game-hint'),
  scoreForm: document.querySelector('#score-form'), scoreList: document.querySelector('#score-list'),
  pantryTitle: document.querySelector('#pantry-title'), pantryCopy: document.querySelector('#pantry-copy'),
  progress: document.querySelector('#progress-fill'), progressLabel: document.querySelector('#progress-label'),
  startButton: document.querySelector('#start-button'), returnButton: document.querySelector('#return-button'),
};

function readSave() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') }; }
  catch { return { ...defaults }; }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch { /* Browser storage can be unavailable. */ }
}
function updateHud() {
  ui.air.textContent = `${Math.ceil(trip.air)}%`;
  ui.airFill.style.width = `${trip.air}%`;
  ui.airFill.style.background = trip.air < 25 ? '#e9795c' : '#236b67';
  ui.haul.textContent = String(trip.haul);
  ui.shells.textContent = String(saved.shells);
  ui.day.textContent = `DAY ${saved.day}`;
  const shared = Math.min(saved.sharedFish, 6);
  ui.progress.style.width = `${(shared / 6) * 100}%`;
  ui.progressLabel.textContent = `${shared} of 6 fish shared`;
  if (shared >= 6) {
    ui.pantryTitle.textContent = 'The pantry is full of good things';
    ui.pantryCopy.textContent = 'Malia has the kitchen humming again. Neighbours gather by the warm lantern light and there is always a bowl for one more.';
  } else if (shared >= 3) {
    ui.pantryTitle.textContent = 'Lanterns are glowing again';
    ui.pantryCopy.textContent = 'The village kitchen is brighter and busier. Malia is saving you a seat at the table.';
  } else if (shared > 0) {
    ui.pantryTitle.textContent = 'The first meal is shared';
    ui.pantryCopy.textContent = 'A little goes a long way. Malia has lit the kitchen lantern and your neighbours are gathering for dinner.';
  }
}
let toastTimer;
function toast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('visible'), 2200);
}
function chirp(frequency = 540, duration = .08) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency; oscillator.type = 'sine';
    gain.gain.setValueAtTime(.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
  } catch { /* Sound is optional. */ }
}

function makeTexture(scene, key, width, height, paint) {
  if (scene.textures.exists(key)) return;
  const art = scene.make.graphics({ x: 0, y: 0, add: false });
  paint(art);
  art.generateTexture(key, width, height);
  art.destroy();
}
function makeFishTexture(scene, key, body, fin) {
  makeTexture(scene, key, 72, 42, (g) => {
    g.fillStyle(0x153b3d); g.fillTriangle(10, 21, 0, 9, 1, 33);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(body).color); g.fillEllipse(37, 21, 48, 27);
    g.fillStyle(Phaser.Display.Color.HexStringToColor(fin).color); g.fillTriangle(30, 10, 43, 1, 50, 11);
    g.fillStyle(0x153b3d); g.fillCircle(53, 17, 2.5);
    g.lineStyle(2, 0xffedc4, .9); g.lineBetween(32, 10, 32, 31); g.lineBetween(42, 9, 42, 32);
  });
}
function makeWorldTextures(scene) {
  makeTexture(scene, 'reef-diver', 100, 84, (g) => {
    g.fillStyle(0x153b3d); g.fillTriangle(21, 53, 2, 45, 4, 65); g.fillTriangle(29, 66, 8, 77, 28, 78);
    g.fillStyle(0x75c5b2); g.fillTriangle(21, 53, 2, 45, 5, 63); g.fillTriangle(29, 66, 8, 76, 27, 75);
    g.fillStyle(0xe9795c); g.fillRoundedRect(24, 47, 41, 31, 9);
    g.fillStyle(0xf1bf55); g.fillRect(32, 50, 9, 23); g.fillStyle(0x2a7972); g.fillRect(48, 50, 10, 23);
    g.lineStyle(9, 0x153b3d); g.lineBetween(56, 53, 74, 44); g.lineStyle(5, 0xf2bd88); g.lineBetween(56, 53, 74, 44);
    g.lineStyle(3, 0x153b3d); g.lineBetween(73, 44, 84, 39); g.lineBetween(74, 45, 87, 46); g.lineBetween(73, 47, 83, 52);
    g.fillStyle(0xf2bd88); g.fillCircle(47, 32, 20); g.fillStyle(0x153b3d); g.fillEllipse(44, 18, 38, 20);
    g.fillStyle(0x8fc8ba); g.fillRoundedRect(29, 26, 39, 15, 6); g.lineStyle(3, 0x153b3d); g.strokeRoundedRect(29, 26, 39, 15, 6);
    g.fillStyle(0x153b3d); g.fillCircle(42, 33, 1.8); g.fillCircle(56, 33, 1.8);
    g.lineStyle(8, 0x153b3d); g.lineBetween(58, 67, 75, 70); g.lineStyle(4, 0xf2bd88); g.lineBetween(58, 67, 75, 70);
    g.fillStyle(0xb98e51); g.fillEllipse(38, 78, 49, 10); g.lineStyle(2, 0xf1d18e); g.strokeEllipse(38, 76, 49, 10);
  });
  makeFishTexture(scene, 'fish-reef', '#f3c257', '#e8834d');
  makeFishTexture(scene, 'fish-moon', '#a8d8c7', '#e98b6b');
  makeFishTexture(scene, 'fish-coral', '#ec8065', '#f2c45e');
  makeTexture(scene, 'reef-shark', 170, 92, (g) => {
    g.fillStyle(0x17494b); g.fillEllipse(78, 45, 112, 39); g.fillTriangle(68, 29, 87, 3, 108, 30); g.fillTriangle(76, 59, 94, 84, 110, 58); g.fillTriangle(128, 45, 166, 23, 159, 45); g.fillTriangle(128, 45, 166, 67, 159, 45);
    g.fillStyle(0x78a99f); g.fillEllipse(78, 42, 106, 34); g.fillTriangle(68, 28, 87, 7, 105, 30); g.fillTriangle(76, 57, 94, 79, 107, 57); g.fillTriangle(128, 42, 163, 24, 157, 42); g.fillTriangle(128, 42, 163, 63, 157, 42);
    g.fillStyle(0xffedc4); g.fillCircle(111, 38, 3); g.lineStyle(2, 0xffedc4, .8); g.lineBetween(56, 31, 56, 54); g.lineBetween(63, 30, 63, 55);
  });
  makeTexture(scene, 'shell-charm', 38, 38, (g) => {
    g.fillStyle(0x153b3d); g.fillCircle(19, 19, 15); g.fillStyle(0xf2cc77); g.fillCircle(19, 19, 12);
    g.fillStyle(0x2c6c66); g.fillCircle(19, 19, 6); g.fillStyle(0xf2cc77); g.fillCircle(19, 19, 2);
  });
  makeTexture(scene, 'spear-shot', 56, 12, (g) => {
    g.fillStyle(0x163f40); g.fillTriangle(54, 6, 44, 0, 44, 12);
    g.fillStyle(0xe9b957); g.fillRect(0, 4, 47, 4);
    g.fillStyle(0x163f40); g.fillRect(5, 2, 3, 8);
  });
  makeTexture(scene, 'reef-coral', 82, 120, (g) => {
    g.lineStyle(10, 0xe9785d, 1); g.lineBetween(41, 113, 41, 34); g.lineBetween(41, 72, 18, 51); g.lineBetween(18, 51, 13, 26); g.lineBetween(41, 57, 62, 36); g.lineBetween(62, 36, 69, 15); g.lineBetween(19, 51, 5, 46); g.lineBetween(62, 36, 76, 37);
    g.lineStyle(2, 0xffe0a8, .9); g.lineBetween(39, 106, 39, 45); g.lineBetween(42, 70, 22, 52); g.lineBetween(43, 56, 61, 38);
  });
  makeTexture(scene, 'reef-seaweed', 76, 116, (g) => {
    g.lineStyle(8, 0x286f65, 1); g.lineBetween(38, 112, 21, 18); g.lineBetween(40, 112, 45, 2); g.lineBetween(43, 112, 68, 26);
    g.lineStyle(3, 0x9bc8a0, .6); g.lineBetween(37, 100, 23, 31); g.lineBetween(41, 99, 46, 12); g.lineBetween(45, 100, 64, 39);
  });
  makeTexture(scene, 'village-house', 210, 150, (g) => {
    g.fillStyle(0x163e40); g.fillTriangle(5, 64, 45, 8, 206, 62); g.fillStyle(0xc7755b); g.fillTriangle(13, 59, 48, 17, 198, 60);
    g.fillStyle(0xf1dfae); g.fillRect(26, 62, 158, 78); g.fillStyle(0x327977); g.fillRect(45, 83, 42, 39); g.fillRect(125, 83, 42, 39);
    g.fillStyle(0xf3c86e); g.fillRect(49, 87, 34, 31); g.fillRect(129, 87, 34, 31); g.fillStyle(0x183e40); g.fillRect(102, 89, 20, 51);
    g.lineStyle(2, 0xf8e7bd, .85); for(let y=27;y<58;y+=9){g.lineBetween(30,y,190,y);}
  });
  ['#d97858', '#d9b25d', '#79b59d'].forEach((color, i) => {
    makeTexture(scene, `villager-${i}`, 68, 100, (g) => {
      g.fillStyle(0x183d3d); g.fillRoundedRect(13, 46, 43, 48, 12); g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color); g.fillRoundedRect(17, 49, 35, 42, 10);
      g.fillStyle(0xf0bc8d); g.fillCircle(34, 31, 19); g.fillStyle(0x294b49); g.fillEllipse(34, 19, 39, 18); g.fillStyle(0x183d3d); g.fillCircle(28, 32, 2); g.fillCircle(41, 32, 2);
    });
  });
}

class ReefScene extends Phaser.Scene {
  constructor() { super('ReefScene'); }
  init(data) { this.autoStart = Boolean(data?.autoStart); }
  preload() {
    this.load.image('reef-print', '/images/game/reef.webp');
    for (const [key,file] of [['reef-diver','diver-swim'],['fish-reef','gold-swim'],['fish-moon','teal-swim'],['fish-coral','coral-swim'],['reef-shark','shark-swim'],['villager-0','malia-idle'],['villager-1','tane-idle'],['villager-2','piko-idle']]) {
      this.load.spritesheet(key, `/images/game/${file}.webp`, {frameWidth:256,frameHeight:256});
    }
    this.load.image('village-art','/images/game/village-night.webp');
    this.load.image('boat-art','/images/game/boat.webp');
    this.load.image('shell-charm','/images/game/charm.webp');
  }
  create() {
    makeWorldTextures(this);
    for(const [key,count,fps] of [['reef-diver',12,10],['fish-reef',8,8],['fish-moon',8,8],['fish-coral',8,8],['reef-shark',8,7],['villager-0',6,3],['villager-1',6,3],['villager-2',6,3]]){
      if(!this.anims.exists(key+'-loop'))this.anims.create({key:key+'-loop',frames:this.anims.generateFrameNumbers(key,{start:0,end:count-1}),frameRate:fps,repeat:-1});
    }
    this.activeDive = false;
    this.bumpReady = true;
    this.touch = { x: 0, y: 0 };
    this.moveTarget = null;
    this.cooldownToast = 0;
    this.fishList = [];
    this.makeBackground();
    this.makeReefObjects();
    this.player = this.physics.add.sprite(145, 255, 'reef-diver').setDisplaySize(150,150).setDepth(10);
    this.player.setBodySize(100, 75).setCollideWorldBounds(true).setDrag(620, 620).setMaxVelocity(220, 180);
    if(!reducedMotion)this.player.play('reef-diver-loop');
    this.physics.world.setBounds(0, 112, WORLD_WIDTH, 360);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, HEIGHT);
    this.cameras.main.startFollow(this.player, true, .08, .08);
    this.objective = this.add.text(20, 28, '', {fontFamily:'Georgia',fontSize:'15px',fontStyle:'bold',color:'#f5dfad',backgroundColor:'#172c2dd9',padding:{x:10,y:7}}).setScrollFactor(0).setDepth(15);
    this.targetRing = this.add.graphics().setDepth(11);
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyboardHandler = (event) => {
      if (event.code === 'Space' || event.key === ' ') { event.preventDefault(); this.catchNearby(); }
      if (event.code === 'Escape' || event.key === 'Escape') { event.preventDefault(); this.returnHome(); }
    };
    this.input.keyboard.on('keydown', this.keyboardHandler);
    this.physics.add.overlap(this.player, this.predator, this.onPredatorBump, null, this);
    this.physics.add.overlap(this.player, this.fishGroup, this.onFishBump, null, this);
    this.physics.add.overlap(this.player, this.charm, () => { this.charmNearby = true; }, null, this);
    this.game.events.on('start-dive', this.startDive, this);
    this.game.events.on('return-shore', this.returnHome, this);
    this.game.events.on('touch-move', this.setTouch, this);
    this.game.events.on('catch-action', this.catchNearby, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('start-dive', this.startDive, this);
      this.game.events.off('return-shore', this.returnHome, this);
      this.game.events.off('touch-move', this.setTouch, this);
      this.game.events.off('catch-action', this.catchNearby, this);
      this.input.keyboard.off('keydown', this.keyboardHandler);
    });
    this.input.on('pointerdown', (pointer) => {
      if (!this.activeDive || pointer.downElement?.id === 'start-button') return;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (Math.hypot(world.x - this.player.x, world.y - this.player.y) > 54) this.moveTarget = world;
    });
    updateHud();
    this.game.canvas.id = 'game-canvas';
    this.game.canvas.setAttribute('aria-label', 'Reefkeeper 2D underwater scene');
    this.game.canvas.setAttribute('tabindex', '0');
    ui.startButton.disabled = false;
    ui.startButton.innerHTML = 'Start the dive <span>→</span>';
    this.game.events.emit('reefkeeper-ready');
    if (this.autoStart) this.startDive();
  }
  makeBackground() {
    const bg = this.add.graphics().setDepth(0);
    bg.fillGradientStyle(0x79bcb2, 0x79bcb2, 0x155d64, 0x155d64, 1); bg.fillRect(0, 0, WORLD_WIDTH, HEIGHT);
    for (let x = 0; x < WORLD_WIDTH; x += 420) {
      bg.fillStyle(0xf9e3a9, .07); bg.fillTriangle(x + 20, 115, x + 120, 115, x + 360, 470);
      bg.fillStyle(0xf2cf77, .8); bg.fillCircle(x + 305, 65, 24);
    }
    bg.fillStyle(0xe9d88f, .85); bg.fillRect(0, 108, WORLD_WIDTH, 4);
    bg.fillStyle(0xc3a06c, 1); bg.fillRect(0, 471, WORLD_WIDTH, 69);
    bg.lineStyle(2, 0xf5e5ad, .45);
    for (let x = 0; x < WORLD_WIDTH; x += 58) {
      bg.lineBetween(x, 506, x + 12, 496); bg.lineBetween(x + 12, 496, x + 25, 506); bg.lineBetween(x + 25, 506, x + 37, 496); bg.lineBetween(x + 37, 496, x + 49, 506);
    }
    const waves = this.add.graphics().setDepth(2); waves.lineStyle(2, 0xd1ecdb, .48);
    for (let x = 0; x < WORLD_WIDTH; x += 140) { waves.beginPath(); waves.moveTo(x, 86); waves.lineTo(x + 65, 86); waves.lineTo(x + 85, 90); waves.lineTo(x + 125, 90); waves.strokePath(); }
    this.add.image(0,0,'reef-print').setOrigin(0).setDepth(2);
    this.add.image(1620,0,'reef-print').setOrigin(0).setFlipX(true).setDepth(2);
    this.add.image(85,150,'boat-art').setDisplaySize(180,90).setDepth(5);
    this.add.text(19, 185, 'YOUR BOAT', { fontFamily: 'system-ui', fontSize: '11px', color: '#173f40', fontStyle: 'bold', backgroundColor: '#f3e8c6', padding: { x: 5, y: 3 } }).setDepth(6);
  }
  makeReefObjects() {
    this.fishGroup = this.physics.add.group({ allowGravity: false });
    const fishDefs = [
      [310, 286, 'fish-reef', 'reef dart'], [495, 366, 'fish-moon', 'moonfin'], [690, 222, 'fish-coral', 'coral wrasse'],
      [960, 350, 'fish-reef', 'reef dart'], [1125, 255, 'fish-moon', 'moonfin'], [1340, 380, 'fish-coral', 'coral wrasse'],
      [1570, 215, 'fish-reef', 'reef dart'], [1775, 340, 'fish-moon', 'moonfin'], [2060, 266, 'fish-coral', 'coral wrasse'],
    ];
    fishDefs.forEach(([x, y, texture, name], index) => {
      const sprite = this.fishGroup.create(x, y, texture).setDisplaySize(texture==='fish-reef'?56:66,texture==='fish-reef'?56:66).setDepth(7);
      if(!reducedMotion)sprite.play(texture+'-loop');
      sprite.setBodySize(160, 100); sprite.body.setAllowGravity(false); sprite.setData({ name, baseY: y, phase: index * .91, pace: 16 + (index % 3) * 8 });
      this.fishList.push(sprite);
    });
    this.predator = this.physics.add.sprite(1155, 314, 'reef-shark').setDisplaySize(260,260).setDepth(8).setImmovable(true);
    this.predator.body.setAllowGravity(false).setSize(160,40);
    if(!reducedMotion)this.predator.play('reef-shark-loop');
    this.predatorBaseX = 1155;
    this.charm = this.physics.add.staticSprite(315, 400, 'shell-charm').setDisplaySize(28,28).setDepth(9);
    this.charm.refreshBody();
    const marker = this.add.text(315, 369, '✦ LOST CHARM', { fontFamily: 'system-ui', fontSize: '10px', color: '#183b3b', fontStyle: 'bold', backgroundColor: '#f3e7bd', padding: { x: 5, y: 3 } }).setOrigin(.5).setDepth(9);
    this.charmMarker = marker;
    const coralPositions = [[170,472,.82],[410,474,1.04],[780,473,1.2],[1010,475,.9],[1470,474,1.2],[1850,476,.85],[2280,474,1.12]];
    // Reef scenery is painted into the illustrated environment layer.
    this.add.text(WORLD_WIDTH-165, 137, 'SWIM HOME  ←', { fontFamily: 'system-ui', fontSize: '11px', color: '#173f40', fontStyle: 'bold', backgroundColor: '#f3e8c6', padding: { x: 6, y: 4 } }).setDepth(6);
  }
  startDive() {
    if (this.activeDive) return;
    this.activeDive = true; trip.active = true; trip.air = 100; trip.haul = 0; trip.foundCharm = false; this.charmNearby = false;
    ui.phase.textContent = 'REEF DIVE'; ui.returnButton.disabled = false; ui.start.hidden = true; ui.night.hidden = true; ui.scoreForm.hidden = true;
    ui.hint.innerHTML = saved.spearGun ? 'Move near a fish and press <kbd>SPACE</kbd> to fire your spear gun.' : 'Swim close to a fish, then press <kbd>SPACE</kbd> or Catch.';
    this.game.canvas.focus();
    this.player.setPosition(145, 255).setVelocity(0, 0).setAlpha(1);
    this.cameras.main.startFollow(this.player, true, .08, .08);
    updateHud(); toast('Follow the fish. Find the shell charm farther along the reef.');
  }
  setTouch(vector) { this.touch.x = vector.x; this.touch.y = vector.y; this.moveTarget = null; }
  onFishBump(player, fish) { fish.setData('close', true); }
  onPredatorBump(player) {
    if (!this.activeDive || !this.bumpReady) return;
    this.bumpReady = false; this.time.delayedCall(1400, () => { this.bumpReady = true; });
    const away = Math.sign(this.player.x - this.predator.x) || -1;
    this.player.setVelocity(away * 265, this.player.y < this.predator.y ? -105 : 105);
    trip.air = Math.max(1, trip.air - 12); updateHud(); toast('A big reef fish swam by! Give it some space.'); chirp(200,.12);
  }
  celebrateCatch(x, y) {
    const burst = this.add.graphics().setPosition(x,y).setDepth(14);
    burst.lineStyle(3,0xf5dfad,.9);burst.strokeCircle(0,0,26);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;burst.lineBetween(Math.cos(a)*32,Math.sin(a)*32,Math.cos(a)*40,Math.sin(a)*40);}
    this.tweens.add({targets:burst,scale:1.6,alpha:0,duration:400,onComplete:()=>burst.destroy()});
    const label=this.add.text(x,y-22,'+1 fish',{fontFamily:'Georgia',fontSize:'16px',fontStyle:'bold',color:'#f5dfad',stroke:'#172c2d',strokeThickness:3}).setOrigin(.5).setDepth(14);
    this.tweens.add({targets:label,y:y-65,alpha:0,duration:700,onComplete:()=>label.destroy()});
  }
  catchNearby() {
    if (!this.activeDive) return;
    if (this.player.x < 118 && this.player.y < 195) { this.returnHome(); return; }
    if (this.charm.active && Phaser.Math.Distance.Between(this.charm.x, this.charm.y, this.player.x, this.player.y) < 58) {
      trip.foundCharm = true; this.charm.disableBody(true, true); this.charmMarker.setVisible(false); toast('You found Piko’s shell charm!'); chirp(780,.14); return;
    }
    const range = saved.spearGun ? 230 : 76;
    const nearest = this.fishList.filter(f => f.active && !f.getData('caught')).map(f => ({ f, d: Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) })).sort((a,b)=>a.d-b.d)[0];
    if (nearest && nearest.d <= range) {
      if (trip.haul >= (saved.biggerBasket ? 9 : MAX_BASKET)) { toast('Your basket is full. Head back to the boat.'); return; }
      const fish = nearest.f;
      fish.setData('caught', true);
      if (saved.spearGun) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, fish.x, fish.y);
        const shot = this.add.image(this.player.x, this.player.y, 'spear-shot').setRotation(angle).setDepth(12);
        this.physics.add.existing(shot);
        shot.body.setAllowGravity(false).setSize(44, 8);
        const speed = 540;
        shot.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        let hit = false;
        const overlap = this.physics.add.overlap(shot, fish, () => {
          if (hit || !fish.visible) return;
          hit = true; shot.destroy(); this.physics.world.removeCollider(overlap);
          this.tweens.add({ targets: fish, x: this.player.x + 10, y: this.player.y + 28, alpha: 0, scaleX: fish.scaleX*.25, scaleY:fish.scaleY*.25, duration: 230, onComplete: () => fish.disableBody(true, true) });
          this.celebrateCatch(fish.x,fish.y); trip.haul += 1; updateHud(); toast(`Spear shot! Caught a ${fish.getData('name')}.`); chirp(650,.09);
        });
        this.time.delayedCall(950, () => { if (shot.active) shot.destroy(); if (!hit) fish.setData('caught', false); this.physics.world.removeCollider(overlap); });
        toast('Spear away!'); chirp(360,.05); return;
      }
      this.tweens.add({ targets: fish, x: this.player.x + 10, y: this.player.y + 28, alpha: 0, scaleX: fish.scaleX*.25, scaleY:fish.scaleY*.25, duration: 230, onComplete: () => fish.disableBody(true, true) });
      this.celebrateCatch(fish.x,fish.y); trip.haul += 1; updateHud(); toast(`Caught a ${fish.getData('name')}!`); chirp(650,.09); return;
    }
    toast('Swim close to a fish or the lost charm first.');
  }
  returnHome(reason = 'You chose to return') {
    if (!this.activeDive) return;
    this.activeDive = false; trip.active = false; trip.air = Math.max(1, trip.air);
    this.player.setVelocity(0,0); ui.returnButton.disabled = true; ui.phase.textContent = 'BACK ON SHORE';
    if (trip.haul > saved.bestHaul) { saved.bestHaul = trip.haul; persist(); ui.scoreForm.hidden = trip.haul <= 0; }
    ui.nightTitle.textContent = reason.includes('air') ? 'A good time to come home.' : 'Welcome home, diver.';
    ui.nightMessage.textContent = `${reason}. You brought back ${trip.haul} fish${trip.foundCharm && !saved.keepsakeReturned ? ' and found something special' : ''}.`;
    ui.nightDay.textContent = String(saved.day);
    ui.quest.textContent = trip.foundCharm && !saved.keepsakeReturned ? '✦ You found Piko’s shell charm. Give it back tonight!' : saved.keepsakeReturned ? '✦ Piko’s shell charm is back where it belongs.' : '☼ Piko thinks something shiny washed up near the sandy reef.';
    const share = document.querySelector('#share-button'); share.textContent = trip.haul ? `Share ${trip.haul} fish with the village` : 'Share the catch'; share.disabled = trip.haul <= 0;
    const merchant = ensureMerchant();
    const nextItem = saved.spearGun ? saved.biggerBasket ? saved.airTank ? null : 'airTank' : 'biggerBasket' : 'spearGun';
    merchant.hidden = !(saved.day >= 2 && saved.day % 2 === 0 && nextItem);
    if (nextItem) merchant.textContent = `Night market · ${nextItem === 'spearGun' ? 'Spear gun (3 shells)' : nextItem === 'biggerBasket' ? 'Larger basket (4 shells)' : 'Air tank (4 shells)'}`;
    ui.night.querySelector('#continue-button').hidden = false;
    ui.start.hidden = true; ui.night.hidden = false;
    this.game.events.emit('show-shore');
    this.scene.start('ShoreScene');
    toast('Safe and sound on shore.');
  }
  update(time, delta) {
    if (!this.activeDive || document.hidden) return;
    const dt = Math.min(delta, 40) / 1000;
    this.objective.setText(`DINNER  ${trip.haul}/${saved.biggerBasket?9:6}    ·    ${trip.foundCharm || saved.keepsakeReturned ? 'CHARM FOUND' : 'FIND THE SHELL CHARM'}`);
    this.targetRing.clear();
    const target=this.fishList.find(f=>f.active&&!f.getData('caught')&&Phaser.Math.Distance.Between(f.x,f.y,this.player.x,this.player.y)<(saved.spearGun?230:76));
    if(target){this.targetRing.lineStyle(2,0xf5dfad,.8);this.targetRing.strokeCircle(target.x,target.y,32);}
    trip.air = Math.max(0, trip.air - dt * (saved.airTank ? .92 : 1.3)); updateHud();
    if (trip.air <= 0) { this.returnHome('Your air was running low, so the boat brought you safely home'); return; }
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    let vx = Number(right) - Number(left) + this.touch.x;
    let vy = Number(down) - Number(up) + this.touch.y;
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x; const dy = this.moveTarget.y - this.player.y;
      if (Math.hypot(dx,dy) < 20) this.moveTarget = null;
      else { vx = dx; vy = dy; }
    }
    const length = Math.hypot(vx,vy) || 1; const speed = saved.spearGun ? 188 : 208;
    if (vx || vy) this.player.setVelocity((vx/length)*speed,(vy/length)*speed); else this.player.setVelocity(0,0);
    if (vx) this.player.setFlipX(vx<0);
    if (!reducedMotion) this.player.setAngle(Phaser.Math.Clamp(vy * 4,-10,10)); else this.player.setAngle(0);
    this.game.canvas.dataset.playerPosition = `${Math.round(this.player.x)},${Math.round(this.player.y)}`;
    this.fishList.forEach((fish) => {
      if (!fish.active || fish.getData('caught')) return;
      const phase = fish.getData('phase'); const drift = Math.sin(time / 850 + phase) * fish.getData('pace');
      fish.setVelocityX(drift); fish.y = fish.getData('baseY') + Math.sin(time / 430 + phase) * 7;
      fish.setFlipX(drift < 0);
    });
    this.predator.x = this.predatorBaseX + Math.sin(time / 1700) * 78;
    this.predator.setFlipX(Math.cos(time / 1700)>0);
    this.predator.y = 315 + Math.sin(time / 850) * 52;
  }
}

class ShoreScene extends Phaser.Scene {
  constructor() { super('ShoreScene'); }
  create() {
    makeWorldTextures(this);
    this.add.image(480,337.5,'village-art').setDisplaySize(1200,675);
    this.repairs=this.add.graphics().setDepth(1);this.paintRepairs();
    this.game.events.on('village-repaired',this.paintRepairs,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.game.events.off('village-repaired',this.paintRepairs,this));
    const villagers=[
      {id:'malia',name:'Malia · Cook',x:210,color:0,idleFrame:0,idleSpeed:.83},
      {id:'tane',name:'Tane · Builder',x:475,color:1,idleFrame:2,idleSpeed:1.07},
      {id:'piko',name:'Piko · Explorer',x:740,color:2,idleFrame:4,idleSpeed:.96},
    ];
    villagers.forEach(v=>{
      const sprite=this.add.sprite(v.x,v.id==='piko'?310:300,`villager-${v.color}`).setDisplaySize(v.id==='piko'?104:128,v.id==='piko'?104:128).setInteractive({useHandCursor:true});
      if(!reducedMotion){
        sprite.play({key:`villager-${v.color}-loop`,startFrame:v.idleFrame});
        sprite.anims.timeScale=v.idleSpeed;
      }
      const baseScale=sprite.scaleX;
      this.add.text(v.x,370,v.name,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#173f40',backgroundColor:'#f4e7c6',padding:{x:5,y:4}}).setOrigin(.5);
      sprite.on('pointerdown',()=>this.game.events.emit('villager-talk',v.id));
      sprite.on('pointerover',()=>sprite.setScale(baseScale*1.08));sprite.on('pointerout',()=>sprite.setScale(baseScale));
    });
    this.add.text(480,426,'CLICK A NEIGHBOUR TO TALK',{fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#f6e9c9',backgroundColor:'#164c4ccc',padding:{x:8,y:5}}).setOrigin(.5);
    this.add.text(480,485,'SHARE DINNER · TALK · REST',{fontFamily:'Georgia',fontSize:'23px',fontStyle:'bold',color:'#f7e8c2'}).setOrigin(.5);
    this.game.events.on('next-day',this.nextDay,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.game.events.off('next-day',this.nextDay,this));
  }
  paintRepairs() {
    const g = this.repairs; g.clear();
    if(saved.sharedFish>0){
      const count=Math.min(5,Math.ceil(saved.sharedFish/2));
      for(let i=0;i<count;i++){g.fillStyle(0xffc76b,.16);g.fillCircle(110+i*170,265,26);g.fillStyle(0xffd987,.8);g.fillRect(105+i*170,258,10,14);}
    }
  }

  nextDay() {
    saved.day += 1; persist(); trip.active=false; trip.shared=false; trip.foundCharm=false; trip.speaker=0;
    ui.night.hidden=true;ui.scoreForm.hidden=true;ui.returnButton.disabled=true;ui.phase.textContent='READY TO DIVE';
    ui.start.hidden=true;ui.night.hidden=true;trip.haul=0;trip.air=100;updateHud();
    this.scene.start('ReefScene', { autoStart: true });
  }
}
function yoyoJitter(index){return index%2?300:0;}
function ensureMerchant(game) {
  let button = document.querySelector('#merchant-button');
  if (button) return button;
  button=document.createElement('button');button.id='merchant-button';button.className='button button-paper';button.type='button';button.textContent='Visit the night market';button.hidden=true;
  document.querySelector('#night-overlay .night-actions').insertBefore(button,document.querySelector('#continue-button'));
  button.addEventListener('click',()=>{
    const item = saved.spearGun ? saved.biggerBasket ? 'airTank' : 'biggerBasket' : 'spearGun';
    const cost = item === 'spearGun' ? 3 : 4;
    const itemName = item === 'spearGun' ? 'spear gun' : item === 'biggerBasket' ? 'larger fish basket' : 'air tank';
    if(saved.shells<cost){ui.nightTitle.textContent='A tool for another time';ui.nightMessage.textContent=`The travelling fisher has a ${itemName} for ${cost} shells. Bring back a few more fish and you’ll have enough.`;return;}
    saved.shells-=cost;saved[item]=true;persist();updateHud();button.hidden=true;ui.nightTitle.textContent='A new tool for your next dive!';
    ui.nightMessage.textContent=item==='spearGun'?'You traded 3 shells for a spear gun. It fires a little spear to catch fish from farther away.':item==='biggerBasket'?'You traded 4 shells for a larger basket. It can carry 3 more fish on your next dive.':'You traded 4 shells for an air tank. Your air lasts longer on each dive.';
    ui.quest.textContent=`↗ Upgrade ready: ${itemName}.`;
  });
  return button;
}
function talk(id) {
  const lines={
    malia:['Malia, the cook','“These fish will make a lovely dinner. Thank you for thinking of everyone.”'],
    tane:['Tane, the builder','“We have a steady board on the dock now. Tomorrow I’ll mend the crooked rail.”'],
    piko:["Piko, the explorer",trip.foundCharm&&!saved.keepsakeReturned?'“My shell charm! I thought the storm carried it out to sea. Thank you!”':'“I lost my little shell charm in the storm. I think it’s somewhere in the reef.”'],
  };
  const [name,line]=lines[id]||lines.malia;ui.nightTitle.textContent=name;ui.nightMessage.textContent=line;
  if(id==='piko'&&trip.foundCharm&&!saved.keepsakeReturned){saved.keepsakeReturned=true;saved.shells+=2;persist();updateHud();ui.quest.textContent='✦ Piko’s shell charm is back! They gave you 2 shells for the next dive.';}
}
function shareCatch() {
  if(trip.haul<=0||trip.shared)return;
  saved.sharedFish+=trip.haul;saved.shells+=trip.haul;trip.shared=true;persist();updateHud();game.events.emit('village-repaired');
  ui.nightTitle.textContent='The village shares a meal';ui.nightMessage.textContent='Malia serves dinner under the lanterns. Everyone has a plate, and you saved a few shells for a future upgrade.';
  const button=document.querySelector('#share-button');button.disabled=true;button.textContent='Dinner is served ✓';
  ui.quest.textContent=saved.sharedFish>=6?'✿ The pantry is full. The whole village is ready for dinner!':`✿ Pantry progress: ${Math.min(saved.sharedFish,6)} of 6 fish. The kitchen is warming up!`;
  if(trip.haul>=saved.bestHaul)ui.scoreForm.hidden=false;
  toast('A shared meal, a brighter village.');
}
function renderScores(scores) {
  ui.scoreList.replaceChildren();
  if(!scores.length){const li=document.createElement('li');li.className='score-empty';li.textContent='No big baskets yet. You can be the first!';ui.scoreList.append(li);return;}
  scores.forEach((entry,index)=>{const li=document.createElement('li');const label=document.createElement('span');label.textContent=`${index<3?'✦':`${index+1}.`}  ${entry.nickname}`;const score=document.createElement('span');score.className='score-points';score.textContent=`${entry.score} fish`;li.append(label,score);ui.scoreList.append(li);});
}
async function loadScores() {
  try{const response=await fetch(`/api/scores?game=${GAME_SLUG}`);if(!response.ok)throw Error();const result=await response.json();renderScores(Array.isArray(result.scores)?result.scores:[]);}
  catch{const li=document.createElement('li');li.className='score-empty';li.textContent='Score board is taking a rest. Your adventure still works!';ui.scoreList.replaceChildren(li);}
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game-host',
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: '#2a7776',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WIDTH, height: HEIGHT },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  render: { antialias: true, pixelArt: false, roundPixels: true },
  scene: [ReefScene, ShoreScene],
});

game.events.on('reefkeeper-ready',()=>{
  ui.startButton.disabled=false;
  ui.startButton.innerHTML='Start the dive <span>→</span>';
});
game.events.on('show-shore',()=>{
  ui.night.hidden=false;ui.returnButton.disabled=true;ui.phase.textContent='BACK ON SHORE';
});
game.events.on('villager-talk',talk);
document.querySelector('#start-button').addEventListener('click',()=>{game.events.emit('start-dive');});
ui.returnButton.addEventListener('click',()=>game.events.emit('return-shore'));
document.querySelector('#touch-catch').addEventListener('click',()=>game.events.emit('catch-action'));
document.querySelector('#share-button').addEventListener('click',shareCatch);
document.querySelector('#talk-button').addEventListener('click',()=>{const id=['malia','tane','piko'][trip.speaker%3];trip.speaker+=1;talk(id);});
document.querySelector('#continue-button').addEventListener('click',()=>game.events.emit('next-day'));
document.querySelector('#sound-toggle').addEventListener('click',(event)=>{const button=event.currentTarget;soundEnabled=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(soundEnabled));button.querySelector('span').textContent=soundEnabled?'Sound on':'Sound off';if(soundEnabled)chirp(510,.07);});
document.querySelectorAll('[data-move]').forEach(button=>{
  const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[button.dataset.move];
  const send=(x,y)=>game.events.emit('touch-move',{x,y});
  button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);send(...d);});
  const stop=event=>{event.preventDefault();if(button.hasPointerCapture?.(event.pointerId))button.releasePointerCapture(event.pointerId);send(0,0);};
  button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('pointerleave',stop);
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){game.loop.sleep();}else{game.loop.wake();}});
document.querySelector('#score-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=ui.scoreForm.querySelector('button');button.disabled=true;button.textContent='Saving…';
  try{const response=await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:GAME_SLUG,nickname:new FormData(ui.scoreForm).get('nickname'),score:trip.haul})});if(!response.ok)throw Error();ui.scoreForm.hidden=true;toast('Your basket is on the board!');await loadScores();}
  catch{toast('The board is resting; try again later.');}
  finally{button.disabled=false;button.innerHTML='Save basket <span>→</span>';}
});
updateHud();loadScores();
