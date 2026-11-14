import Phaser from 'phaser';

const WIDTH = 960;
const HEIGHT = 540;
const WORLD_WIDTH = 2400;
const MAX_BASKET = 6;
const GAME_SLUG = 'reefkeeper';
const SAVE_KEY = 'reefkeeper-save';
const defaults = { day: 1, sharedFish: 0, shells: 0, keepsakeReturned: false, spearGun: false, biggerBasket: false, airTank: false, bestHaul: 0, wood: 0, repairs: {}, species: {}, moonQuest: false };
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
function makeWorldTextures(scene) {
  makeTexture(scene, 'spear-shot', 56, 12, (g) => {
    g.fillStyle(0x163f40); g.fillTriangle(54, 6, 44, 0, 44, 12);
    g.fillStyle(0xe9b957); g.fillRect(0, 4, 47, 4);
    g.fillStyle(0x163f40); g.fillRect(5, 2, 3, 8);
  });
}

// Blend poses at state changes; movement and idle each own a distinct animation.
function transitionPose(scene,sprite,texture,animation){
  if(sprite.poseGhost){scene.tweens.killTweensOf(sprite.poseGhost);sprite.poseGhost.destroy();}
  scene.tweens.killTweensOf(sprite);
  const ghost=scene.add.image(sprite.x,sprite.y,sprite.texture.key,sprite.frame.name).setOrigin(sprite.originX,sprite.originY).setScale(sprite.scaleX,sprite.scaleY).setFlipX(sprite.flipX).setAngle(sprite.angle).setDepth(sprite.depth+.1);
  sprite.poseGhost=ghost;
  sprite.anims.stop();sprite.setTexture(texture,0);
  if(!reducedMotion)sprite.play(animation);
  if(reducedMotion){ghost.destroy();sprite.poseGhost=null;sprite.setAlpha(1);return;}
  sprite.setAlpha(0);
  scene.tweens.add({targets:sprite,alpha:1,duration:140});
  scene.tweens.add({targets:ghost,alpha:0,duration:140,onUpdate:()=>ghost.setPosition(sprite.x,sprite.y).setFlipX(sprite.flipX).setAngle(sprite.angle),onComplete:()=>{ghost.destroy();if(sprite.poseGhost===ghost)sprite.poseGhost=null;}});
}

class ReefScene extends Phaser.Scene {
  constructor() { super('ReefScene'); }
  init(data) { this.autoStart = Boolean(data?.autoStart); }
  preload() {
    this.load.json('game-art-manifest','/images/game/manifest.json?v=idle-transition-8');
    this.load.image('reef-print', '/images/game/reef.webp');
    for (const [key,file] of [['reef-diver','diver-swim'],['fish-reef','gold-swim'],['fish-moon','teal-swim'],['fish-coral','coral-swim'],['reef-shark','shark-swim'],['villager-0','malia-idle'],['villager-1','tane-idle'],['villager-2','piko-idle']]) {
      this.load.spritesheet(key, `/images/game/${file}.webp?v=idle-transition-8`, {frameWidth:256,frameHeight:256});
    }
    this.load.image('town-restored','/images/game/town-restored.webp?v=idle-transition-8');
    this.load.image('town-panorama','/images/game/town-panorama.webp?v=idle-transition-8');
    this.load.spritesheet('shore-idle','/images/game/shore-idle.webp?v=idle-transition-8',{frameWidth:256,frameHeight:256});
    this.load.spritesheet('diver-float','/images/game/diver-float.webp?v=idle-transition-8',{frameWidth:256,frameHeight:256});
    this.load.spritesheet('shore-diver','/images/game/shore-walk.webp?v=idle-transition-8',{frameWidth:256,frameHeight:256});
    this.load.image('boat-art','/images/game/boat.webp');
    this.load.image('shell-charm','/images/game/charm.webp');
  }
  create() {
    makeWorldTextures(this);
    for(const [key,count,fps] of [['diver-float',8,4],['shore-idle',8,4],['reef-diver',12,10],['fish-reef',8,8],['fish-moon',8,8],['fish-coral',8,8],['reef-shark',8,7],['villager-0',6,3],['villager-1',6,3],['villager-2',6,3]]){
      if(!this.anims.exists(key+'-loop'))this.anims.create({key:key+'-loop',frames:this.anims.generateFrameNumbers(key,{start:0,end:count-1}),frameRate:fps,repeat:-1});
    }
    this.game.canvas.dataset.scene='reef';
    this.activeDive = false;
    this.bumpReady = true;
    this.touch = { x: 0, y: 0 };
    this.moveTarget = null;
    this.cooldownToast = 0;
    this.knockbackUntil = 0;
    this.lastZone = -1;
    this.salvage = [];
    this.bubbles = [];
    this.fishList = [];
    this.makeBackground();
    this.makeReefObjects();
    this.player = this.physics.add.sprite(145, 255, 'reef-diver').setDisplaySize(150,150).setDepth(10);
    this.player.setBodySize(100, 75).setCollideWorldBounds(true).setDrag(620, 620).setMaxVelocity(220, 180);
    this.locomotionState=null;
    this.setLocomotionState(false);
    this.physics.world.setBounds(0, 112, WORLD_WIDTH, 360);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, HEIGHT);
    this.cameras.main.startFollow(this.player, true, .08, .08);
    this.objective = this.add.text(20, 28, '', {fontFamily:'Georgia',fontSize:'15px',fontStyle:'bold',color:'#f5dfad',backgroundColor:'#172c2dd9',padding:{x:10,y:7}}).setScrollFactor(0).setDepth(15);
    this.targetRing = this.add.graphics().setDepth(11);
    this.compass = this.add.graphics().setScrollFactor(0).setDepth(15);
    this.contextLabel = this.add.text(480, 505, '', {fontFamily:'system-ui',fontSize:'14px',fontStyle:'bold',color:'#fff0cb',backgroundColor:'#173b3ee8',padding:{x:12,y:6}}).setOrigin(.5).setScrollFactor(0).setDepth(16);
    this.zoneLabel = this.add.text(940, 28, 'SUNLIT SHALLOWS', {fontFamily:'Georgia',fontSize:'14px',color:'#fff0cb',backgroundColor:'#173b3ed9',padding:{x:10,y:7}}).setOrigin(1,0).setScrollFactor(0).setDepth(15);
    this.time.addEvent({delay:450,loop:true,callback:()=>{
      if(!this.activeDive || reducedMotion) return;
      const bubble=this.add.circle(this.player.x+(this.player.flipX?-40:40),this.player.y-13,Phaser.Math.Between(2,4),0xc4f0df,.35).setDepth(10);
      this.tweens.add({targets:bubble,y:bubble.y-100,x:bubble.x+15,alpha:0,duration:1700,onComplete:()=>bubble.destroy()});
    }});
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.keyboardHandler = (event) => {
      if (event.code === 'Space' || event.key === ' ') { event.preventDefault(); this.catchNearby(); }
      if (event.code === 'Escape' || event.key === 'Escape') { event.preventDefault(); this.returnHome(); }
    };
    this.input.keyboard.on('keydown', this.keyboardHandler);
    this.releaseControls=()=>{this.touch={x:0,y:0};this.moveTarget=null;this.input.keyboard.resetKeys();this.player.setVelocity(0,0);this.setLocomotionState(false);};
    window.addEventListener('blur',this.releaseControls);
    this.game.events.on('release-controls',this.releaseControls);
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
      window.removeEventListener('blur',this.releaseControls);
      this.game.events.off('release-controls',this.releaseControls);
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
    this.add.rectangle(1600,270,800,540,0x073d54,.2).setDepth(3);
    const signs = [[570, 'CORAL GARDEN  →'], [1430, 'THE BLUE REACH  →']];
    signs.forEach(([x,label])=>this.add.text(x,150,label,{fontFamily:'Georgia',fontSize:'13px',color:'#ffedbe',stroke:'#164448',strokeThickness:4}).setDepth(4));
    this.add.image(85,150,'boat-art').setDisplaySize(180,90).setDepth(5);
    this.add.text(19, 185, 'YOUR BOAT', { fontFamily: 'system-ui', fontSize: '11px', color: '#173f40', fontStyle: 'bold', backgroundColor: '#f3e8c6', padding: { x: 5, y: 3 } }).setDepth(6);
  }
  makeReefObjects() {
    this.fishGroup = this.physics.add.group({ allowGravity: false });
    const fishDefs = [
      [310, 286, 'fish-reef', 'reef dart'], [495, 366, 'fish-moon', 'moonfin'], [690, 222, 'fish-coral', 'coral wrasse'],
      [960, 350, 'fish-reef', 'reef dart'], [1125, 255, 'fish-moon', 'moonfin'], [1340, 380, 'fish-coral', 'coral wrasse'],
      [1570, 215, 'fish-reef', 'reef dart'], [1775, 340, 'fish-moon', 'moonfin'], [2060, 266, 'fish-coral', 'coral wrasse'],
      [790, 250, 'fish-coral', 'coral wrasse'], [1500, 350, 'fish-moon', 'moonfin'], [1900, 205, 'fish-moon', 'moonfin'],
      [2180, 345, 'fish-coral', 'coral wrasse'], [2260, 270, 'fish-reef', 'reef dart'],
    ];
    fishDefs.forEach(([x, y, texture, name], index) => {
      const artKey={'fish-reef':'gold-swim','fish-moon':'teal-swim','fish-coral':'coral-swim'}[texture];
      const size=this.cache.json.get('game-art-manifest')[artKey].displayFrameSize;
      const sprite = this.fishGroup.create(x, y, texture).setDisplaySize(size,size).setDepth(7);
      if(!reducedMotion)sprite.play({key:texture+'-loop',startFrame:index%8});
      sprite.setBodySize(160, 100); sprite.body.setAllowGravity(false); sprite.setData({ name, species: {'fish-reef':'reef','fish-moon':'moon','fish-coral':'coral'}[texture], baseX:x, baseY: y, phase: index * .91, pace: 16 + (index % 3) * 8 });
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
    if(saved.keepsakeReturned){this.charm.disableBody(true,true);marker.setVisible(false);}
    [[660,420],[1270,425],[1960,420]].forEach(([x,y],index)=>{
      const bundle=this.add.container(x,y).setDepth(9);
      const art=this.add.graphics();
      art.lineStyle(10,0x183c3c);art.lineBetween(-21,-5,21,4);art.lineBetween(-20,7,22,-4);
      art.lineStyle(6,0xd6a55e);art.lineBetween(-21,-5,21,4);art.lineBetween(-20,7,22,-4);
      art.lineStyle(2,0xf2dfac);art.lineBetween(-3,-9,-7,10);art.lineBetween(4,-8,0,10);
      const glint=this.add.text(0,-24,'✦',{fontSize:'18px',color:'#fff0b6'}).setOrigin(.5);
      bundle.add([art,glint]);bundle.setData('collected',false);this.salvage.push(bundle);
      if(!reducedMotion)this.tweens.add({targets:glint,alpha:.35,duration:800+index*130,yoyo:true,repeat:-1});
    });
    const coralPositions = [[170,472,.82],[410,474,1.04],[780,473,1.2],[1010,475,.9],[1470,474,1.2],[1850,476,.85],[2280,474,1.12]];
    // Reef scenery is painted into the illustrated environment layer.
    this.add.text(WORLD_WIDTH-165, 137, 'SWIM HOME  ←', { fontFamily: 'system-ui', fontSize: '11px', color: '#173f40', fontStyle: 'bold', backgroundColor: '#f3e8c6', padding: { x: 6, y: 4 } }).setDepth(6);
  }
  setLocomotionState(moving) {
    const state=moving?'swimming':'floating';
    if(this.locomotionState!==state){
      this.locomotionState=state;
      transitionPose(this,this.player,moving?'reef-diver':'diver-float',moving?'reef-diver-loop':'diver-float-loop');
      this.game.canvas.dataset.scene='reef';
      this.game.canvas.dataset.swimmerState=state;
    }
    this.game.canvas.dataset.swimmerFrame=String(this.player.frame.name);
    this.game.canvas.dataset.swimmerTexture=this.player.texture.key;
  }
  startDive() {
    if (this.activeDive) return;
    this.activeDive = true; trip.active = true; trip.air = 100; trip.haul = 0; trip.foundCharm = false; trip.shared = false; trip.species = {reef:0,moon:0,coral:0}; trip.salvage = 0; this.pendingShots = 0; this.charmNearby = false;
    ui.phase.textContent = 'REEF DIVE'; ui.returnButton.disabled = false; ui.start.hidden = true; ui.night.hidden = true; ui.scoreForm.hidden = true;
    ui.hint.innerHTML = saved.spearGun ? 'Move near a fish and press <kbd>SPACE</kbd> to fire your spear gun.' : 'Swim close to a fish, then press <kbd>SPACE</kbd> or Catch.';
    this.game.canvas.focus();
    this.player.setPosition(145, 255).setVelocity(0, 0).setAlpha(1);
    this.setLocomotionState(false);
    this.cameras.main.startFollow(this.player, true, .08, .08);
    updateHud(); toast('Explore the reef. Fish feed the village; washed-up wood helps rebuild it.');
  }
  setTouch(vector) { this.touch.x = vector.x; this.touch.y = vector.y; this.moveTarget = null; }
  onFishBump(player, fish) { fish.setData('close', true); }
  onPredatorBump(player) {
    if (!this.activeDive || !this.bumpReady) return;
    this.bumpReady = false; this.time.delayedCall(1400, () => { this.bumpReady = true; });
    const away = Math.sign(this.player.x - this.predator.x) || -1;
    this.knockbackUntil = this.time.now + 300;
    this.moveTarget = null;
    this.player.setVelocity(away * 265, this.player.y < this.predator.y ? -105 : 105);
    trip.air = Math.max(1, trip.air - 12); updateHud(); toast('Reef shark! Give it room — you used a little extra air.'); chirp(200,.12);
  }
  celebrateCatch(x, y) {
    const burst = this.add.graphics().setPosition(x,y).setDepth(14);
    burst.lineStyle(3,0xf5dfad,.9);burst.strokeCircle(0,0,26);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;burst.lineBetween(Math.cos(a)*32,Math.sin(a)*32,Math.cos(a)*40,Math.sin(a)*40);}
    this.tweens.add({targets:burst,scale:1.6,alpha:0,duration:400,onComplete:()=>burst.destroy()});
    const label=this.add.text(x,y-22,'+1 fish',{fontFamily:'Georgia',fontSize:'16px',fontStyle:'bold',color:'#f5dfad',stroke:'#172c2d',strokeThickness:3}).setOrigin(.5).setDepth(14);
    this.tweens.add({targets:label,y:y-65,alpha:0,duration:700,onComplete:()=>label.destroy()});
  }
  recordCatch(fish) {
    trip.haul += 1;
    const species=fish.getData('species');
    trip.species[species]=(trip.species[species]||0)+1;
    this.game.canvas.dataset.catchSpecies=JSON.stringify(trip.species);
    updateHud();
  }
  catchNearby() {
    if (!this.activeDive) return;
    if (this.player.x < 118 && this.player.y < 195) { this.returnHome(); return; }
    if (this.charm.active && Phaser.Math.Distance.Between(this.charm.x, this.charm.y, this.player.x, this.player.y) < 58) {
      trip.foundCharm = true; this.charm.disableBody(true, true); this.charmMarker.setVisible(false); toast('You found Piko’s shell charm!'); chirp(780,.14); return;
    }
    const wood=this.salvage.find(item=>!item.getData('collected')&&Phaser.Math.Distance.Between(item.x,item.y,this.player.x,this.player.y)<62);
    if(wood){wood.setData('collected',true);wood.setVisible(false);trip.salvage+=1;toast('Useful timber! Take it to Tane to rebuild the village.');chirp(720,.1);return;}
    const range = saved.spearGun ? 230 : 76;
    const nearest = this.fishList.filter(f => f.active && !f.getData('caught')).map(f => ({ f, d: Phaser.Math.Distance.Between(f.x, f.y, this.player.x, this.player.y) })).sort((a,b)=>a.d-b.d)[0];
    if (nearest && nearest.d <= range) {
      if (trip.haul + this.pendingShots >= (saved.biggerBasket ? 9 : MAX_BASKET)) { toast('Your basket is full. Head back to the boat.'); return; }
      const fish = nearest.f;
      fish.setData('caught', true);
      fish.setVelocity(0,0);
      if (saved.spearGun) {
        this.pendingShots += 1;
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, fish.x, fish.y);
        const shot = this.add.image(this.player.x, this.player.y, 'spear-shot').setRotation(angle).setDepth(12);
        this.physics.add.existing(shot);
        shot.body.setAllowGravity(false).setSize(44, 8);
        const speed = 540;
        shot.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        let hit = false;
        const overlap = this.physics.add.overlap(shot, fish, () => {
          if (hit || !fish.visible) return;
          hit = true; this.pendingShots-=1; shot.destroy(); this.physics.world.removeCollider(overlap);
          this.tweens.add({ targets: fish, x: this.player.x + 10, y: this.player.y + 28, alpha: 0, scaleX: fish.scaleX*.25, scaleY:fish.scaleY*.25, duration: 230, onComplete: () => fish.disableBody(true, true) });
          this.celebrateCatch(fish.x,fish.y); this.recordCatch(fish); toast(`Spear shot! Caught a ${fish.getData('name')}.`); chirp(650,.09);
        });
        this.time.delayedCall(950, () => { if (shot.active) shot.destroy(); if (!hit) {fish.setData('caught', false);this.pendingShots-=1;} this.physics.world.removeCollider(overlap); });
        toast('Spear away!'); chirp(360,.05); return;
      }
      this.tweens.add({ targets: fish, x: this.player.x + 10, y: this.player.y + 28, alpha: 0, scaleX: fish.scaleX*.25, scaleY:fish.scaleY*.25, duration: 230, onComplete: () => fish.disableBody(true, true) });
      this.celebrateCatch(fish.x,fish.y); this.recordCatch(fish); toast(`Caught a ${fish.getData('name')}!`); chirp(650,.09); return;
    }
    toast('Swim close to a fish or the lost charm first.');
  }
  returnHome(reason = 'You chose to return') {
    if (!this.activeDive) return;
    saved.wood = (saved.wood || 0) + (trip.salvage || 0);
    persist();
    this.activeDive = false; trip.active = false; trip.air = Math.max(1, trip.air);
    this.setLocomotionState(false);
    this.player.setVelocity(0,0); ui.returnButton.disabled = true; ui.phase.textContent = 'BACK ON SHORE';
    if (trip.haul > saved.bestHaul) { saved.bestHaul = trip.haul; persist(); ui.scoreForm.hidden = trip.haul <= 0; }
    ui.nightTitle.textContent = reason.includes('air') ? 'A good time to come home.' : 'Welcome home, diver.';
    ui.nightMessage.textContent = `${reason}. You brought back ${trip.haul} fish and ${trip.salvage || 0} timber${trip.foundCharm && !saved.keepsakeReturned ? ' and found something special' : ''}.`;
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
    this.objective.setText(`CATCH  ${trip.haul}/${saved.biggerBasket?9:6}    ·    TIMBER  ${trip.salvage}    ·    ${trip.foundCharm || saved.keepsakeReturned ? 'CHARM ✓' : 'FIND PIKO’S CHARM'}`);
    const zone=this.player.x<700?0:this.player.x<1550?1:2;
    const zoneNames=['SUNLIT SHALLOWS','CORAL GARDEN','THE BLUE REACH'];
    this.zoneLabel.setText(zoneNames[zone]);
    if(zone!==this.lastZone){if(this.lastZone>=0)toast(zoneNames[zone]);this.lastZone=zone;}
    this.compass.clear();this.compass.fillStyle(0x173b3e,.8);this.compass.fillRoundedRect(740,65,200,26,9);
    this.compass.lineStyle(2,0x7fb5a5);this.compass.lineBetween(751,78,929,78);
    this.compass.fillStyle(0xe8ba66);this.compass.fillCircle(751+(this.player.x/WORLD_WIDTH)*178,78,4);
    this.game.canvas.dataset.reefZone=String(zone);
    this.game.canvas.dataset.salvage=String(trip.salvage);
    this.targetRing.clear();
    const target=this.fishList.find(f=>f.active&&!f.getData('caught')&&Phaser.Math.Distance.Between(f.x,f.y,this.player.x,this.player.y)<(saved.spearGun?230:76));
    if(target){this.targetRing.lineStyle(2,0xf5dfad,.8);this.targetRing.strokeCircle(target.x,target.y,32);}
    const nearWood=this.salvage.some(item=>!item.getData('collected')&&Phaser.Math.Distance.Between(item.x,item.y,this.player.x,this.player.y)<62);
    const nearCharm=this.charm.active&&Phaser.Math.Distance.Between(this.charm.x,this.charm.y,this.player.x,this.player.y)<58;
    const nearShark=Phaser.Math.Distance.Between(this.predator.x,this.predator.y,this.player.x,this.player.y)<200;
    this.contextLabel.setText(nearCharm?'SPACE / CATCH · Pick up Piko’s charm':nearWood?'SPACE / CATCH · Collect repair timber':target?`SPACE / CATCH · ${target.getData('name')}`:nearShark?'Reef shark ahead · swim around it':trip.haul>=(saved.biggerBasket?9:MAX_BASKET)?'Basket full · Return to the village':trip.air<25?'Air is low · Return when you’re ready':'Explore · Catch dinner · Find things washed away by the storm');
    trip.air = Math.max(0, trip.air - dt * (saved.airTank ? .92 : 1.3)); updateHud();
    if (trip.air <= 0) { this.returnHome('Your air was running low, so the boat brought you safely home'); return; }
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    let vx = Number(right) - Number(left) + this.touch.x;
    let vy = Number(down) - Number(up) + this.touch.y;
    if(vx||vy)this.moveTarget=null;
    if (this.moveTarget) {
      const dx = this.moveTarget.x - this.player.x; const dy = this.moveTarget.y - this.player.y;
      if (Math.hypot(dx,dy) < 20) this.moveTarget = null;
      else { vx = dx; vy = dy; }
    }
    const length = Math.hypot(vx,vy) || 1; const speed = saved.spearGun ? 188 : 208;
    if(this.time.now < this.knockbackUntil) { vx=0;vy=0; }
    else if (vx || vy) this.player.setVelocity((vx/length)*speed,(vy/length)*speed); else this.player.setVelocity(0,0);
    const swimming=Boolean(vx||vy);
    this.setLocomotionState(swimming);
    if (vx) this.player.setFlipX(vx<0);
    const targetAngle=reducedMotion?0:swimming?Phaser.Math.Clamp(vy/length*6,-6,6):Math.sin(time/1200)*1.2;
    this.player.setAngle(Phaser.Math.Linear(this.player.angle,targetAngle,Math.min(1,dt*8)));
    this.game.canvas.dataset.playerPosition = `${Math.round(this.player.x)},${Math.round(this.player.y)}`;
    this.fishList.forEach((fish) => {
      if (!fish.active || fish.getData('caught')) return;
      const phase = fish.getData('phase');
      const desiredX=fish.getData('baseX')+Math.sin(time/1800+phase)*60;
      const distance=Phaser.Math.Distance.Between(fish.x,fish.y,this.player.x,this.player.y);
      // Slow, readable schools; nearby fish dart a little, but remain catchable.
      const flee=distance<48?Math.sign(fish.x-this.player.x)*28:0;
      const drift=Phaser.Math.Clamp((desiredX-fish.x)*.8+flee,-44,44);
      fish.setVelocityX(drift);fish.y=fish.getData('baseY')+Math.sin(time/950+phase)*13;
      fish.setFlipX(drift < 0);
    });
    this.predator.x = this.predatorBaseX + Math.sin(time / 2100) * 170;
    this.predator.setFlipX(Math.cos(time / 2100)>0);
    this.predator.y = 315 + Math.sin(time / 850) * 52;
  }
}

const villagePlaces = [
  {id:'malia',name:'Malia’s kitchen',x:340,person:0},
  {id:'home',name:'Family home',x:680,repair:'home'},
  {id:'tane',name:'Tane’s workshop',x:990,person:1},
  {id:'market',name:'Travelling market',x:1320},
  {id:'piko',name:'Piko’s lookout',x:1600,person:2},
];
const projects = {
  kitchen:{name:'Kitchen roof',food:3,wood:1,x:340},
  home:{name:'Family home',food:6,wood:2,x:680},
  dock:{name:'Fishing jetty',food:12,wood:3,x:100},
};
class ShoreScene extends Phaser.Scene {
  constructor() { super('ShoreScene'); }
  create() {
    this.game.canvas.dataset.scene='village';
    this.add.image(0,-60,'town-panorama').setOrigin(0).setDisplaySize(1800,600);
    this.cameras.main.setBounds(0,0,1800,540);
    this.repairLayer=this.add.container(0,0).setDepth(3);
    this.paintRepairs();
    this.player=this.add.sprite(160,452,'shore-diver').setDisplaySize(116,116).setOrigin(.5,.94).setDepth(12);
    if(!this.anims.exists('shore-walk'))this.anims.create({key:'shore-walk',frames:this.anims.generateFrameNumbers('shore-diver',{start:0,end:7}),frameRate:10,repeat:-1});
    this.cameras.main.startFollow(this.player,false,.08,.08);
    this.walkState=null;this.setWalking(false);
    this.touch={x:0};this.target=null;
    this.keys=this.input.keyboard.addKeys('LEFT,RIGHT,A,D,SPACE');
    villagePlaces.forEach((v,i)=>{
      if(v.person!==undefined){
        const size=v.person===2?104:128;
        const npc=this.add.sprite(v.x,432,`villager-${v.person}`).setDisplaySize(size,size).setOrigin(.5,.94).setDepth(9).setInteractive({useHandCursor:true});
        if(!reducedMotion){npc.play({key:`villager-${v.person}-loop`,startFrame:i%6});npc.anims.timeScale=[.83,1.07,.96][v.person];}
        npc.on('pointerdown',()=>this.visit(v.id));
      }
      this.add.text(v.x,470,v.name,{fontFamily:'Georgia',fontSize:'16px',color:'#fff0c9',backgroundColor:'#193c3be8',padding:{x:9,y:7}}).setOrigin(.5).setDepth(14).setInteractive({useHandCursor:true}).on('pointerdown',()=>this.visit(v.id));
    });
    this.location=this.add.text(20,20,'HOME AGAIN · WALK THE VILLAGE',{fontFamily:'Georgia',fontSize:'19px',color:'#ffedc3',backgroundColor:'#173b3be8',padding:{x:12,y:9}}).setScrollFactor(0).setDepth(20);
    this.prompt=this.add.text(480,515,'← → Walk  ·  Space to talk  ·  Click a place to visit',{fontFamily:'system-ui',fontSize:'13px',color:'#ffedc3',backgroundColor:'#173b3be8',padding:{x:10,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(20);
    this.input.on('pointerdown',p=>{if(!this.input.hitTestPointer(p).length)this.target=Phaser.Math.Clamp(this.cameras.main.getWorldPoint(p.x,p.y).x,70,1730);});
    this.onMove=v=>{this.touch=v;this.target=null;};
    this.onVisit=id=>this.visit(id);
    this.onAction=()=>this.interact();
    this.release=()=>{this.touch={x:0};this.target=null;this.input.keyboard.resetKeys();};
    window.addEventListener('blur',this.release);
    for(const [event,fn] of [['touch-move',this.onMove],['village-visit',this.onVisit],['catch-action',this.onAction],['release-controls',this.release],['next-day',this.nextDay],['village-repaired',this.paintRepairs]])this.game.events.on(event,fn,this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('blur',this.release);for(const [event,fn] of [['touch-move',this.onMove],['village-visit',this.onVisit],['catch-action',this.onAction],['release-controls',this.release],['next-day',this.nextDay],['village-repaired',this.paintRepairs]])this.game.events.off(event,fn,this);});
    document.querySelector('#touch-catch').innerHTML='TALK<br><small>SPACE</small>';
    ui.hint.textContent='Walk through the village. Visit a neighbour, share supper, and choose what to repair.';
    renderVillageJournal();
  }
  visit(id){
    const place=villagePlaces.find(v=>v.id===id);if(place)this.target=place.x-55;
    if(['malia','tane','piko'].includes(id))talk(id);
    else if(id==='home'){ui.nightTitle.textContent='A roof for rainy days';ui.nightMessage.textContent=saved.repairs.home?'The family has moved back in. Dry beds, bright windows, and laughter again.':'Tane needs 2 salvaged timbers and 6 shared fish to finish this home. Choose Family home in the repair board below.';}
    else {ui.nightTitle.textContent='The travelling market';ui.nightMessage.textContent=saved.day%2===0?'The travelling fisher is here tonight. Trade your shells for a useful upgrade.':'The merchant visits every second night. Come back tomorrow for new fishing gear.';}
  }
  interact(){const nearest=[...villagePlaces].sort((a,b)=>Math.abs(a.x-this.player.x)-Math.abs(b.x-this.player.x))[0];if(Math.abs(nearest.x-this.player.x)<170)this.visit(nearest.id);else toast('Walk closer to a neighbour or choose a place below.');}
  paintRepairs(){
    this.repairLayer.removeAll(true);
    const sections={dock:[0,240],kitchen:[180,610],home:[600,960]};
    for(const [id,[left,right]] of Object.entries(sections))if(saved.repairs[id]){
      const restored=this.add.image(0,-60,'town-restored').setOrigin(0).setCrop(left,0,right-left,600);
      this.repairLayer.add(restored);
      const label=this.add.text(projects[id].x,145,projects[id].name+' ✓',{fontFamily:'Georgia',fontSize:'14px',color:'#183b36',backgroundColor:'#f7d286',padding:{x:8,y:5}}).setOrigin(.5);
      this.repairLayer.add(label);
    }
    this.game.canvas.dataset.repairs=JSON.stringify(saved.repairs);
    if(saved.sharedFish>0){for(const x of [335,680,990])this.repairLayer.add(this.add.circle(x,350,24,0xffce72,.15));}
  }
  setWalking(moving){
    const state=moving?'walking':'standing';
    if(this.walkState!==state){this.walkState=state;transitionPose(this,this.player,moving?'shore-diver':'shore-idle',moving?'shore-walk':'shore-idle-loop');}
    this.game.canvas.dataset.walkerState=state;this.game.canvas.dataset.walkerTexture=this.player.texture.key;this.game.canvas.dataset.walkerFrame=String(this.player.frame.name);
  }
  update(time,delta){
    let direction=Number(this.keys.RIGHT.isDown||this.keys.D.isDown)-Number(this.keys.LEFT.isDown||this.keys.A.isDown)+(this.touch.x||0);
    if(direction)this.target=null;
    if(this.target!==null){if(Math.abs(this.target-this.player.x)<5)this.target=null;else direction=Math.sign(this.target-this.player.x);}
    const oldX=this.player.x;
    this.player.x=Phaser.Math.Clamp(oldX+direction*190*Math.min(delta,40)/1000,70,1730);
    if(direction)this.player.setFlipX(direction<0);
    this.setWalking(Math.abs(this.player.x-oldX)>.01);
    if(Phaser.Input.Keyboard.JustDown(this.keys.SPACE))this.interact();
    this.game.canvas.dataset.villagePosition=String(Math.round(this.player.x));
  }
  nextDay() {
    saved.day+=1;persist();trip.active=false;trip.shared=false;trip.foundCharm=false;trip.speaker=0;
    ui.night.hidden=true;ui.scoreForm.hidden=true;ui.returnButton.disabled=true;ui.start.hidden=true;trip.haul=0;trip.air=100;updateHud();
    document.querySelector('#touch-catch').innerHTML='CATCH<br><small>SPACE</small>';
    this.scene.start('ReefScene',{autoStart:true});
  }
}
function renderVillageJournal(){
  const board=document.querySelector('#repair-board');board.replaceChildren();
  document.querySelector('#wood-count').textContent=String(saved.wood||0);
  for(const [id,p] of Object.entries(projects)){
    const button=document.createElement('button');button.className='repair-project';button.type='button';button.dataset.project=id;
    button.textContent=saved.repairs[id]?`${p.name} · Rebuilt ✓`:`${p.name} · ${p.wood} timber + ${p.food} meals shared`;
    button.disabled=!!saved.repairs[id]||saved.wood<p.wood||saved.sharedFish<p.food;
    button.addEventListener('click',()=>{if(saved.repairs[id]||saved.wood<p.wood||saved.sharedFish<p.food)return;saved.wood-=p.wood;saved.repairs[id]=true;persist();renderVillageJournal();game.events.emit('village-repaired');ui.nightTitle.textContent=p.name+' rebuilt!';ui.nightMessage.textContent='Your meals kept the builders going. Your salvaged timber finished the job. Another piece of home is back.';toast('The village rebuilt '+p.name.toLowerCase()+'!');});board.append(button);
  }
  document.querySelector('#village-requests').textContent=`Malia: ${saved.moonQuest?'Moonfin supper complete ✓':`Share 2 moonfins (${Math.min(2,saved.species.moon||0)}/2)`} · Piko: ${saved.keepsakeReturned?'Charm returned ✓':'Find the lost shell charm'} · Tane: Salvage timber along the reef.`;
}
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
  if(id==='malia'){ui.nightMessage.textContent=saved.moonQuest?'“Everyone loved the moonfin supper. There’s always a seat for you here.”':'“Two moonfins would make a special supper. Share them with the kitchen, then come and see me!”';if(!saved.moonQuest&&(saved.species.moon||0)>=2){saved.moonQuest=true;saved.shells+=3;persist();updateHud();ui.nightMessage.textContent='“Two lovely moonfins! Supper is going to be wonderful. Here are 3 shells for helping.”';}}
  if(id==='tane')ui.nightMessage.textContent=`“Find timber washed into the reef and keep the kitchen fed. Then we can mend the roofs and jetty. You have ${saved.wood||0} timber ready.”`;
  if(id==='piko'&&saved.keepsakeReturned)ui.nightMessage.textContent='“My shell charm is safe again. I wear it on every little adventure. Thank you!”';
  if(id==='piko'&&trip.foundCharm&&!saved.keepsakeReturned){saved.keepsakeReturned=true;saved.shells+=2;persist();updateHud();ui.quest.textContent='✦ Piko’s shell charm is back! They gave you 2 shells for the next dive.';}
  renderVillageJournal();
}
function shareCatch() {
  if(trip.haul<=0||trip.shared)return;
  saved.sharedFish+=trip.haul;saved.shells+=trip.haul;for(const [kind,count] of Object.entries(trip.species||{}))saved.species[kind]=(saved.species[kind]||0)+count;trip.shared=true;persist();updateHud();game.events.emit('village-repaired');
  ui.nightTitle.textContent='The village shares a meal';ui.nightMessage.textContent='Malia serves dinner under the lanterns. Everyone has a plate, and you saved a few shells for a future upgrade.';
  const button=document.querySelector('#share-button');button.disabled=true;button.textContent='Dinner is served ✓';
  ui.quest.textContent=saved.sharedFish>=6?'✿ The pantry is full. The whole village is ready for dinner!':`✿ Pantry progress: ${Math.min(saved.sharedFish,6)} of 6 fish. The kitchen is warming up!`;
  if(trip.haul>=saved.bestHaul)ui.scoreForm.hidden=false;
  renderVillageJournal();toast('A shared meal, a brighter village.');
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
  render: { antialias: true, pixelArt: false, roundPixels: false },
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
document.querySelectorAll('[data-visit]').forEach(button=>button.addEventListener('click',()=>game.events.emit('village-visit',button.dataset.visit)));
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
document.addEventListener('visibilitychange',()=>{if(document.hidden){game.events.emit('release-controls');game.loop.sleep();}else{game.loop.wake();}});
document.querySelector('#score-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=ui.scoreForm.querySelector('button');button.disabled=true;button.textContent='Saving…';
  try{const response=await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:GAME_SLUG,nickname:new FormData(ui.scoreForm).get('nickname'),score:trip.haul})});if(!response.ok)throw Error();ui.scoreForm.hidden=true;toast('Your basket is on the board!');await loadScores();}
  catch{toast('The board is resting; try again later.');}
  finally{button.disabled=false;button.innerHTML='Save basket <span>→</span>';}
});
updateHud();loadScores();
