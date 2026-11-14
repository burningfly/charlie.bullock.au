(() => {
  'use strict';

  const GAME = 'reefkeeper';
  const W = 960;
  const H = 540;
  const MAX_HAUL = 6;
  const canvas = document.querySelector('#game-canvas');
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (selector) => document.querySelector(selector);
  const ui = {
    air: $('#air-value'), airFill: $('#air-fill'), haul: $('#haul-count'), shells: $('#shell-count'),
    phase: $('#phase-label'), day: $('#day-label'), start: $('#start-overlay'), night: $('#night-overlay'),
    nightDay: $('#night-day'), nightTitle: $('#night-title'), nightMessage: $('#night-message'),
    quest: $('#quest-note'), toast: $('#toast'), hint: $('#game-hint'), scoreForm: $('#score-form'),
    scoreList: $('#score-list'), pantryTitle: $('#pantry-title'), pantryCopy: $('#pantry-copy'),
    progress: $('#progress-fill'), progressLabel: $('#progress-label'),
  };
  const fishTypes = [
    { name: 'reef dart', color: '#f3c257', fin: '#e8834d', points: 1 },
    { name: 'moonfin', color: '#a8d8c7', fin: '#e98b6b', points: 1 },
    { name: 'coral wrasse', color: '#ec8065', fin: '#f2c45e', points: 1 },
  ];
  const defaultSave = { day: 1, sharedFish: 0, shells: 0, keepsakeReturned: false, spearGun: false, firstVisit: true, bestHaul: 0 };
  let save = readSave();
  let scene = 'intro';
  let nightCount = Math.max(0, save.day - 1);
  let player = { x: 160, y: 285, vx: 0, vy: 0, face: 1, bob: 0 };
  let fish = [];
  let predator = { x: 790, y: 320, baseY: 320, phase: 0, stunned: 0 };
  let keepsake = { x: 675, y: 365, found: false };
  let air = 100;
  let haul = 0;
  let gameTime = 0;
  let lastFrame = 0;
  let toastTimer = 0;
  let nightTalk = 0;
  let shareDone = false;
  let soundOn = false;
  let audio = null;
  const keys = new Set();
  const input = { x: 0, y: 0 };
  const touchInput = { x: 0, y: 0 };

  function readSave() {
    try { return { ...defaultSave, ...JSON.parse(localStorage.getItem('reefkeeper-save') || '{}') }; }
    catch { return { ...defaultSave }; }
  }
  function persist() {
    try { localStorage.setItem('reefkeeper-save', JSON.stringify(save)); } catch { /* Storage can be disabled. */ }
  }
  function setSaveText() {
    ui.haul.textContent = String(haul);
    ui.shells.textContent = String(save.shells);
    ui.day.textContent = `DAY ${save.day}`;
    const shared = Math.min(save.sharedFish, 6);
    ui.progress.style.width = `${shared / 6 * 100}%`;
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
  function seedFish() {
    fish = Array.from({ length: 9 }, (_, i) => ({
      x: i === 0 ? 300 : 350 + Math.random() * 535, y: i === 0 ? 285 : 155 + Math.random() * 305,
      phase: Math.random() * Math.PI * 2, speed: 14 + Math.random() * 19,
      type: i % fishTypes.length, scale: .72 + Math.random() * .5,
    }));
    keepsake = { x: 385, y: 350, found: false };
    predator = { x: 790, y: 315, baseY: 315, phase: Math.random() * 4, stunned: 0 };
  }
  function startDive(first = false) {
    scene = 'day'; air = 100; haul = 0; gameTime = 0;
    player = { x: 160, y: 285, vx: 0, vy: 0, face: 1, bob: 0 };
    seedFish(); setSaveText();
    ui.phase.textContent = 'REEF DIVE';
    ui.start.hidden = true; ui.night.hidden = true; ui.scoreForm.hidden = true;
    ui.hint.innerHTML = 'Swim close to a fish, then press <kbd>SPACE</kbd> to catch it.';
    toast(first ? 'The reef is waking up. Have a look around!' : `Day ${save.day}: the reef is ready when you are.`);
    chirp(440, .07);
  }
  function showNight(reason = 'You made it safely back to shore.') {
    if (scene !== 'day') return;
    scene = 'night';
    ui.phase.textContent = 'BACK ON SHORE';
    ui.night.hidden = false; ui.nightDay.textContent = String(save.day);
    ui.nightTitle.textContent = reason.includes('air') ? 'A good time to come home.' : 'Welcome home, diver.';
    ui.nightMessage.textContent = `${reason} You brought back ${haul} fish${keepsake.found && !save.keepsakeReturned ? ' and found something special' : ''}.`;
    ui.quest.textContent = keepsake.found && !save.keepsakeReturned ? '✦ You found Piko’s shell charm. Give it back tonight!' : save.keepsakeReturned ? '✦ Piko’s shell charm is back where it belongs.' : '☼ Piko thinks something shiny washed up near the sandy reef.';
    ui.night.querySelector('#share-button').textContent = haul ? `Share ${haul} fish with the village` : 'Share the catch';
    ui.night.querySelector('#share-button').disabled = haul === 0;
    ui.night.querySelector('#talk-button').textContent = 'Talk to the villagers';
    ui.night.querySelector('#continue-button').hidden = false;
    const merchant = $('#merchant-button');
    if (merchant) merchant.hidden = !(save.day >= 2 && nightCount % 2 === 1 && !save.spearGun);
    ui.night.querySelector('#share-button').focus({ preventScroll: true });
    if (haul > save.bestHaul) {
      save.bestHaul = haul; persist();
      ui.scoreForm.hidden = haul <= 0;
    }
    toast('Safe and sound back on shore.');
  }
  function returnToShore() { showNight('You chose to return'); }
  function catchNearby() {
    if (scene !== 'day') return;
    let closest = null;
    let closestDistance = save.spearGun ? 150 : 60;
    fish.forEach((f, i) => {
      const dist = Math.hypot(f.x - player.x, f.y - player.y);
      if (dist < closestDistance) { closestDistance = dist; closest = i; }
    });
    if (closest !== null) {
      if (haul >= MAX_HAUL) { toast('Your basket is full. Time to head home!'); chirp(180, .1); return; }
      const caught = fish.splice(closest, 1)[0]; haul += 1; setSaveText();
      toast(`A ${fishTypes[caught.type].name}! Into the basket it goes.`); chirp(620, .08);
      return;
    }
    if (!keepsake.found && Math.hypot(keepsake.x - player.x, keepsake.y - player.y) < 55) {
      keepsake.found = true; toast('A little shell charm! Piko must be looking for this.'); chirp(790, .13); return;
    }
    if (player.x > 885 && player.y < 200) { returnToShore(); return; }
    toast(save.spearGun ? 'Aim for a fish nearby.' : 'Swim a little closer to a fish first.'); chirp(270, .05);
  }
  function talkToVillagers() {
    const lines = [
      ['Malia, the cook', '“These fish will make a lovely dinner. Thank you for thinking of everyone.”'],
      ['Tane, the builder', '“We have a steady board on the dock now. Tomorrow I’ll mend the crooked rail.”'],
      ["Piko, the explorer", keepsake.found && !save.keepsakeReturned ? '“My shell charm! I thought the storm had carried it out to sea. Thank you!”' : '“I lost my little shell charm in the storm. I think it’s somewhere in the sandy reef.”'],
    ];
    const [name, line] = lines[nightTalk % lines.length]; nightTalk++;
    ui.nightTitle.textContent = name; ui.nightMessage.textContent = line;
    if (name.startsWith('Piko') && keepsake.found && !save.keepsakeReturned) {
      save.keepsakeReturned = true; persist(); ui.quest.textContent = '✦ Piko’s shell charm is back! They gave you 2 shells for the next dive.';
      save.shells += 2; setSaveText();
    }
  }
  function ensureMerchant() {
    if ($('#merchant-button')) return;
    const button = document.createElement('button');
    button.className = 'button button-paper'; button.id = 'merchant-button'; button.type = 'button';
    button.textContent = 'Visit the night market'; button.hidden = true;
    $('#night-overlay .night-actions').insertBefore(button, $('#continue-button'));
    button.addEventListener('click', () => {
      if (save.spearGun) { ui.nightTitle.textContent = 'Your spear gun is ready'; ui.nightMessage.textContent = 'It helps you catch fish from farther away. Have a look in the water tomorrow.'; return; }
      if (save.shells < 3) { ui.nightTitle.textContent = 'A tool for another time'; ui.nightMessage.textContent = 'The travelling fisher has a spear gun for 3 shells. Bring back a few more fish and you’ll have enough.'; return; }
      save.shells -= 3; save.spearGun = true; persist(); setSaveText();
      button.hidden = true; ui.nightTitle.textContent = 'A new tool for your next dive!'; ui.nightMessage.textContent = 'You traded 3 shells for a spear gun. Now you can catch fish from farther away.'; ui.quest.textContent = '↗ Spear gun upgrade: catch fish from a little farther away.'; chirp(710, .14);
    });
  }
  function shareCatch() {
    if (!haul || shareDone) return;
    save.sharedFish += haul; save.shells += haul; shareDone = true;
    if (keepsake.found && !save.keepsakeReturned) {
      ui.quest.textContent = '✦ Talk to Piko to return the shell charm.';
    }
    save.firstVisit = false; persist(); setSaveText();
    ui.nightTitle.textContent = 'The village shares a meal';
    ui.nightMessage.textContent = 'Malia serves dinner under the lanterns. Everyone has a plate, and you saved a few shells for a future upgrade.';
    ui.night.querySelector('#share-button').disabled = true;
    ui.night.querySelector('#share-button').textContent = 'Dinner is served ✓';
    if (save.sharedFish >= 1 && save.sharedFish < 6) ui.quest.textContent = `✿ Pantry progress: ${Math.min(save.sharedFish, 6)} of 6 fish. The kitchen is warming up!`;
    if (save.sharedFish >= 6) ui.quest.textContent = '✿ The pantry is full. The whole village is ready for dinner!';
    if (haul > 0 && haul >= save.bestHaul) ui.scoreForm.hidden = false;
    toast('A shared meal, a brighter village.');
  }
  function nextDay() {
    save.day += 1; nightCount++; persist(); shareDone = false; startDive();
  }

  function roundedRect(c, x, y, w, h, r, fill, stroke) {
    c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.stroke(); }
  }
  function polygon(c, points, fill, stroke = '#163a3c', width = 3) {
    c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.lineWidth = width; c.strokeStyle = stroke; c.lineJoin = 'round'; c.stroke(); }
  }
  function drawPattern(c, x, y, scale = 1, color = '#f5e9c4') {
    c.save(); c.translate(x, y); c.scale(scale, scale); c.strokeStyle = color; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, 0); c.lineTo(-8, -7); c.lineTo(0, 0); c.lineTo(8, -7); c.lineTo(16, 0); c.moveTo(-8, 8); c.lineTo(0, 1); c.lineTo(8, 8); c.stroke(); c.restore();
  }
  function drawFish(c, x, y, type, scale = 1, facing = 1) {
    const f = fishTypes[type]; c.save(); c.translate(x, y); c.scale(scale * facing, scale);
    polygon(c, [[-17,0],[-30,-11],[-28,0],[-30,11]], f.fin, '#174748', 2);
    c.beginPath(); c.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2); c.fillStyle = f.color; c.fill(); c.strokeStyle = '#174748'; c.lineWidth = 2; c.stroke();
    polygon(c, [[-4,-9],[3,-18],[9,-9]], f.fin, '#174748', 1.5);
    c.strokeStyle = '#fff0c7'; c.lineWidth = 2; c.beginPath(); c.moveTo(-7,-8); c.lineTo(-7,8); c.moveTo(2,-10); c.lineTo(2,10); c.stroke();
    c.fillStyle = '#153b3c'; c.beginPath(); c.arc(11,-2,2.2,0,Math.PI*2); c.fill();
    c.restore();
  }
  function drawCoral(c, x, y, color, s = 1) {
    c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = color; c.lineWidth = 10;
    c.beginPath(); c.moveTo(0,0); c.lineTo(0,-43); c.moveTo(0,-20); c.lineTo(-20,-37); c.lineTo(-24,-53); c.moveTo(0,-29); c.lineTo(21,-46); c.lineTo(27,-59); c.moveTo(-17,-35); c.lineTo(-32,-40); c.moveTo(17,-43); c.lineTo(32,-43); c.stroke();
    c.strokeStyle = '#ffe7ae'; c.lineWidth = 2; c.beginPath(); c.moveTo(-1,-4); c.lineTo(-1,-25); c.moveTo(1,-28); c.lineTo(19,-44); c.stroke(); c.restore();
  }
  function drawDiver(c, x, y, facing, bob, tiny = false) {
    const s = tiny ? .66 : 1; c.save(); c.translate(x, y + Math.sin(bob) * 2); c.scale(facing * s, s); c.lineJoin = 'round';
    // fins and body
    polygon(c, [[-22,15],[-58,8],[-87,19],[-65,35],[-22,32]], '#76c4b3', '#153b3d', 4);
    polygon(c, [[-21,28],[-49,36],[-76,55],[-49,63],[-9,45]], '#67b7aa', '#153b3d', 4);
    roundedRect(c, -12, 11, 45, 33, 10, '#e9795c', '#153b3d');
    c.fillStyle = '#f1bf55'; c.fillRect(-2,13,12,29); c.fillStyle = '#2a7972'; c.fillRect(17,13,12,29);
    drawPattern(c, 6, 30, .52, '#f8e8c7');
    // far arm and hand
    c.strokeStyle = '#153b3d'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.moveTo(25,17); c.lineTo(48,2); c.lineTo(67,-5); c.stroke();
    c.strokeStyle = '#f2bd88'; c.lineWidth = 10; c.beginPath(); c.moveTo(25,17); c.lineTo(48,2); c.lineTo(67,-5); c.stroke();
    c.strokeStyle = '#153b3d'; c.lineWidth = 4; c.beginPath(); c.moveTo(65,-5); c.lineTo(75,-12); c.moveTo(66,-4); c.lineTo(78,-5); c.moveTo(67,-2); c.lineTo(76,2); c.stroke();
    // head, hair, goggles
    c.fillStyle = '#f2bd88'; c.beginPath(); c.ellipse(7,-17,24,23,-.12,0,Math.PI*2); c.fill(); c.strokeStyle='#153b3d';c.lineWidth=4;c.stroke();
    c.fillStyle='#153b3d';c.beginPath();c.moveTo(-17,-21);c.quadraticCurveTo(-15,-48,11,-43);c.quadraticCurveTo(33,-40,29,-21);c.lineTo(17,-27);c.lineTo(6,-33);c.lineTo(-8,-25);c.closePath();c.fill();
    roundedRect(c, -13, -24, 38, 17, 7, '#b8ddd0', '#153b3d'); c.fillStyle='#244749';c.beginPath();c.arc(3,-16,2,0,7);c.arc(18,-16,2,0,7);c.fill();
    c.strokeStyle='#153b3d';c.lineWidth=2.5;c.beginPath();c.moveTo(8,-1);c.quadraticCurveTo(13,4,18,-1);c.stroke();
    // near arm reaches forward with clear thumb/four fingers
    c.strokeStyle='#153b3d';c.lineWidth=17;c.beginPath();c.moveTo(21,24);c.lineTo(44,35);c.lineTo(67,32);c.stroke();
    c.strokeStyle='#f2bd88';c.lineWidth=10;c.beginPath();c.moveTo(21,24);c.lineTo(44,35);c.lineTo(67,32);c.stroke();
    c.strokeStyle='#153b3d';c.lineWidth=3;c.beginPath();c.moveTo(66,32);c.lineTo(78,28);c.moveTo(67,34);c.lineTo(80,35);c.moveTo(66,37);c.lineTo(77,42);c.moveTo(64,39);c.lineTo(72,47);c.moveTo(65,30);c.lineTo(61,23);c.stroke();
    // basket
    c.fillStyle='#bc9254';c.beginPath();c.ellipse(-1,59,33,13,0,0,Math.PI);c.fill();c.strokeStyle='#153b3d';c.lineWidth=4;c.stroke();
    c.strokeStyle='#f2d390';c.lineWidth=2;c.beginPath();c.ellipse(-1,56,33,13,0,Math.PI,Math.PI*2);c.stroke();c.beginPath();c.moveTo(-20,55);c.lineTo(8,70);c.moveTo(-4,53);c.lineTo(20,65);c.moveTo(11,52);c.lineTo(27,60);c.stroke();
    c.restore();
  }
  function drawSeaweed(c, x, y, s, color) {
    c.save(); c.translate(x, y); c.strokeStyle=color;c.lineWidth=7*s;c.lineCap='round';
    for(let i=0;i<3;i++){const side=i-1;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(side*15*s,-22*s,side*4*s,-50*s,side*17*s,-76*s);c.stroke();}
    c.restore();
  }
  function drawDay(c, t) {
    // sea and distant sunlight
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#78bbb0');g.addColorStop(.53,'#3e918d');g.addColorStop(1,'#155b61');c.fillStyle=g;c.fillRect(0,0,W,H);
    c.fillStyle='#f2c864';c.beginPath();c.arc(770,78,43,0,7);c.fill();
    c.fillStyle='#d4eee0';for(let i=0;i<6;i++){c.globalAlpha=.34;c.fillRect((i*179+((t*10)%179))%W,83+(i%3)*18,58+i%3*26,3);}c.globalAlpha=1;
    // water surface and rays
    c.fillStyle='#f4d78a';c.fillRect(0,113,W,3);c.globalAlpha=.12;polygon(c,[[0,115],[115,115],[370,535],[205,535]],'#f5e7ae',null);polygon(c,[[670,115],[740,115],[900,535],[800,535]],'#ffe9af',null);c.globalAlpha=1;
    // patterned sand/reef floor
    polygon(c,[[0,477],[105,450],[234,477],[343,452],[470,478],[598,453],[710,478],[842,445],[960,475],[960,540],[0,540]],'#bd9660','#194b4a',4);
    c.globalAlpha=.25;for(let x=25;x<W;x+=65){drawPattern(c,x,506,1.2,'#fff0c6');}c.globalAlpha=1;
    drawCoral(c,75,478,'#e9785d',1.15);drawCoral(c,205,475,'#eab951',.85);drawCoral(c,735,478,'#ed7c5f',1.3);drawCoral(c,900,476,'#ebbb53',.9);
    drawSeaweed(c,325,472,1.05,'#286f65');drawSeaweed(c,620,478,1.3,'#2c7568');drawSeaweed(c,828,470,.84,'#286f65');
    // distant coral silhouettes
    for(let i=0;i<4;i++){c.globalAlpha=.28;drawCoral(c,290+i*125,380+i%2*27,'#c6e1c2',.65);}c.globalAlpha=1;
    // a small safe return marker
    roundedRect(c,867,128,71,44,8,'#f4e7c6','#164a4b');c.fillStyle='#17494b';c.font='800 9px DM Sans, sans-serif';c.textAlign='center';c.fillText('BOAT',902,146);c.fillText('HOME',902,160);
    // keepsake
    if(!keepsake.found){c.save();c.translate(keepsake.x,keepsake.y+Math.sin(t*2)*2);c.fillStyle='#f4cf76';c.strokeStyle='#163c3c';c.lineWidth=3;c.beginPath();c.arc(0,0,13,0,7);c.fill();c.stroke();c.beginPath();c.arc(0,0,5,0,7);c.stroke();c.restore();}
    // fish schools
    fish.forEach((f)=>{const y=f.y+Math.sin(t*1.5+f.phase)*9;const x=f.x+Math.sin(t*.8+f.phase)*9;drawFish(c,x,y,f.type,f.scale,Math.sin(t+f.phase)>0?1:-1);});
    // avoidable reef predator, recognizable but non-threatening
    if(predator.stunned<=0){const sharkY=predator.baseY+Math.sin(t*.75+predator.phase)*48;const sharkX=predator.x+Math.sin(t*.35)*46;c.save();c.translate(sharkX,sharkY);c.fillStyle='#7daea3';c.strokeStyle='#17494b';c.lineWidth=3;c.beginPath();c.ellipse(0,0,53,20,0,0,7);c.fill();c.stroke();polygon(c,[[-3,-15],[8,-38],[22,-16]],'#72a89e','#17494b',2);polygon(c,[[-5,15],[9,32],[18,14]],'#72a89e','#17494b',2);polygon(c,[[47,0],[70,-16],[66,0],[70,16]],'#72a89e','#17494b',2);c.fillStyle='#fff1d0';c.beginPath();c.arc(30,-4,3,0,7);c.fill();c.globalAlpha=.5;c.strokeStyle='#fff0d1';c.lineWidth=2;c.beginPath();c.moveTo(-23,-15);c.lineTo(-23,14);c.moveTo(-15,-16);c.lineTo(-15,14);c.stroke();c.restore();
      const sharkDistance=Math.hypot(sharkX-player.x,sharkY-player.y);
      if(sharkDistance<170){roundedRect(c,sharkX-54,sharkY-56,108,22,7,'#eaf0d9','#17494b');c.fillStyle='#17494b';c.font='800 9px DM Sans,sans-serif';c.textAlign='center';c.fillText('GIVE IT SPACE',sharkX,sharkY-42);}
      if(sharkDistance<58){player.x=player.x<sharkX?Math.max(90,player.x-55):Math.min(830,player.x+55);player.y=Math.min(430,Math.max(160,player.y+((player.y<sharkY)?-34:34)));air=Math.max(1,air-13);predator.stunned=1.8;toast('A big fish swam by! Give it some space.');chirp(190,.12);}
    } else predator.stunned-=Math.min(.05,Math.max(.001,1/60));
    drawDiver(c,player.x,player.y,player.face,player.bob);
    // bubbles and soft frame grain
    c.fillStyle='#d2f1d9';for(let i=0;i<6;i++){let bx=player.x-34-(i%3)*11;let by=player.y-47-((t*34+i*17)%70);c.globalAlpha=.35;c.beginPath();c.arc(bx,by,2+i%3,0,7);c.fill();}c.globalAlpha=1;
    c.fillStyle='#143b3d';c.fillRect(0,0,W,8);c.globalAlpha=.5;c.fillStyle='#ffe5ae';for(let x=12;x<W;x+=82){c.fillRect(x,3,20,2);}c.globalAlpha=1;
    // tiny on-canvas prompt markers near interactables
    const target=fish.find(f=>Math.hypot(f.x-player.x,f.y-player.y)<95)||(!keepsake.found&&Math.hypot(keepsake.x-player.x,keepsake.y-player.y)<80?keepsake:null);
    if(target){c.fillStyle='#fff0bd';c.font='800 10px DM Sans,sans-serif';c.textAlign='center';c.fillText('SPACE',target.x,target.y-29);}
  }
  function drawVillage(c,t) {
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#8b6e79');g.addColorStop(.42,'#ce906f');g.addColorStop(.43,'#235b58');g.addColorStop(1,'#123e43');c.fillStyle=g;c.fillRect(0,0,W,H);
    c.fillStyle='#f2cc77';c.beginPath();c.arc(780,98,45,0,7);c.fill();
    c.fillStyle='#263e3f';for(let i=0;i<5;i++){const x=i*230-35;polygon(c,[[x,250],[x+75,160+(i%2)*28],[x+151,250]],'#354f4b',null);}
    // village buildings, roofs read as metal sheets
    for(let i=0;i<3;i++){const x=95+i*285,w=205,h=145,y=215-(i%2)*20;polygon(c,[[x,y],[x+35,y-58],[x+w-13,y-58],[x+w,y]],i===1?'#e8b963':'#c96f58','#153f42',4);c.fillStyle='#ead9ac';c.fillRect(x+12,y,w-24,h);c.fillStyle='#317875';c.fillRect(x+38,y+34,48,53);c.fillRect(x+120,y+34,49,53);c.fillStyle='#f4c86f';c.globalAlpha=.85;c.fillRect(x+41,y+37,42,47);c.fillRect(x+123,y+37,43,47);c.globalAlpha=1;
      c.strokeStyle='#183e41';c.lineWidth=2;for(let r=0;r<5;r++){c.beginPath();c.moveTo(x+18,y-52+r*10);c.lineTo(x+w-17,y-52+r*10);c.stroke();}for(let p=x+25;p<x+w-15;p+=35)drawPattern(c,p,y-29,.48,'#ffe4a2');
    }
    // repaired dock and sea
    c.fillStyle='#236c69';c.fillRect(0,369,W,171);for(let i=0;i<8;i++){const yy=386+i*22;c.strokeStyle=i%2?'#81c6ae':'#e3bd76';c.lineWidth=3;c.beginPath();c.moveTo(0,yy);c.quadraticCurveTo(170,yy-10,340,yy);c.quadraticCurveTo(560,yy+10,750,yy);c.quadraticCurveTo(850,yy-9,960,yy);c.stroke();}
    c.fillStyle='#986f46';c.fillRect(0,350,W,20);for(let i=0;i<12;i++){c.fillStyle='#bb9156';c.fillRect(18+i*82,344,12,45);drawPattern(c,48+i*82,360,.8,'#f3d28e');}
    // lanterns
    for(let i=0;i<5;i++){const x=135+i*175;c.strokeStyle='#3c4040';c.lineWidth=3;c.beginPath();c.moveTo(x,160);c.lineTo(x,208);c.stroke();c.fillStyle='#ffc867';c.globalAlpha=.45+Math.sin(t*3+i)*.08;c.beginPath();c.arc(x,214,18,0,7);c.fill();c.globalAlpha=1;roundedRect(c,x-7,204,14,20,4,'#f0c567','#514a38');}
    // silhouettes of villagers gathering on dock
    const people=[[208,310,'#d97858'],[461,299,'#d9b25d'],[730,312,'#79b59d'],[842,307,'#d78b68']];
    people.forEach(([x,y,color],i)=>{c.fillStyle='#f0bc8d';c.beginPath();c.arc(x,y-20,12,0,7);c.fill();c.fillStyle='#294b49';c.beginPath();c.arc(x,y-24,13,Math.PI,Math.PI*2);c.fill();roundedRect(c,x-13,y-7,27,40,7,color,'#183c3d');if(i%2===0){c.strokeStyle='#f0bc8d';c.lineWidth=5;c.beginPath();c.moveTo(x-10,y+4);c.lineTo(x-23,y+14);c.moveTo(x+10,y+4);c.lineTo(x+22,y-1);c.stroke();}});
    // meal table
    roundedRect(c,387,317,194,14,5,'#bc9256','#183c3d');c.fillStyle='#8b6944';c.fillRect(406,328,8,22);c.fillRect(552,328,8,22);c.fillStyle='#f2d484';for(let i=0;i<3;i++){c.beginPath();c.arc(422+i*58,310,8,0,7);c.fill();}
    // ornamental sky band
    c.fillStyle='#183c3d';c.fillRect(0,0,W,16);for(let x=25;x<W;x+=50)drawPattern(c,x,9,.75,'#f1e4c4');
  }
  function draw() { ctx.clearRect(0,0,W,H); if(scene==='night')drawVillage(ctx,gameTime);else drawDay(ctx,gameTime); }

  function step(now) {
    const dt = Math.min(.04, lastFrame ? (now-lastFrame)/1000 : 0); lastFrame=now;
    if (!document.hidden) {
      if(scene==='day') {
        gameTime += reducedMotion ? 0 : dt; air=Math.max(0,air-dt*1.35); ui.air.textContent=`${Math.ceil(air)}%`; ui.airFill.style.width=`${air}%`; ui.airFill.style.background=air<26?'#e9795c':'#236b67';
        input.x=(keys.has('ArrowRight')||keys.has('d')||keys.has('D')?1:0)-(keys.has('ArrowLeft')||keys.has('a')||keys.has('A')?1:0) || touchInput.x;
        input.y=(keys.has('ArrowDown')||keys.has('s')||keys.has('S')?1:0)-(keys.has('ArrowUp')||keys.has('w')||keys.has('W')?1:0) || touchInput.y;
        const len=Math.hypot(input.x,input.y)||1;const speed=save.spearGun?184:205;
        player.x=Math.max(55,Math.min(900,player.x+input.x/len*speed*dt));player.y=Math.max(140,Math.min(454,player.y+input.y/len*speed*dt));if(input.x)player.face=input.x>0?1:-1;player.bob+=reducedMotion?0:dt*5;
        fish.forEach(f=>{f.x+=Math.sin(gameTime*.7+f.phase)*f.speed*dt;f.x=Math.max(230,Math.min(917,f.x));});
        predator.y=predator.baseY+Math.sin(gameTime*.75+predator.phase)*48;
        if(air<=0) showNight('Your air gauge is low, so your boat brought you safely home.');
      } else gameTime+=reducedMotion?0:dt;
      if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('visible');}
      draw();
    }
    requestAnimationFrame(step);
  }
  function toast(message) {
    ui.toast.textContent=message;ui.toast.classList.add('visible');toastTimer=2.4;
  }
  function chirp(freq=440,duration=.08) {
    if(!soundOn)return;
    try{audio ||= new(window.AudioContext||window.webkitAudioContext)();const osc=audio.createOscillator();const gain=audio.createGain();osc.frequency.value=freq;osc.type='sine';gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}catch{/* Optional sound. */}
  }
  function renderScores(scores) {
    ui.scoreList.replaceChildren();
    if(!scores.length){const li=document.createElement('li');li.className='score-empty';li.textContent='No big baskets yet. You can be the first!';ui.scoreList.append(li);return;}
    scores.forEach((entry,i)=>{const li=document.createElement('li');const name=document.createElement('span');name.textContent=`${['✦','✧','✦'][i]||`${i+1}.`}  ${entry.nickname}`;const value=document.createElement('span');value.className='score-points';value.textContent=`${entry.score} fish`;li.append(name,value);ui.scoreList.append(li);});
  }
  async function loadScores() {
    try{const res=await fetch(`/api/scores?game=${GAME}`,{headers:{Accept:'application/json'}});if(!res.ok)throw Error();const data=await res.json();renderScores(Array.isArray(data.scores)?data.scores:[]);}
    catch{const li=document.createElement('li');li.className='score-empty';li.textContent='Score board is taking a rest. Your adventure still works!';ui.scoreList.replaceChildren(li);}
  }

  $('#start-button').addEventListener('click',()=>startDive(true));
  $('#touch-catch').addEventListener('click',catchNearby);
  $('#share-button').addEventListener('click',shareCatch);
  $('#talk-button').addEventListener('click',talkToVillagers);
  $('#continue-button').addEventListener('click',nextDay);
  $('#sound-toggle').addEventListener('click',(event)=>{soundOn=!soundOn;event.currentTarget.setAttribute('aria-pressed',String(soundOn));event.currentTarget.querySelector('span').textContent=soundOn?'Sound on':'Sound off';if(soundOn)chirp(510,.07);});
  ensureMerchant();
  document.querySelectorAll('[data-move]').forEach(button=>{
    const direction=button.dataset.move;const coords={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const down=(event)=>{event.preventDefault();touchInput.x=coords[direction][0];touchInput.y=coords[direction][1];button.setPointerCapture?.(event.pointerId);};
    const up=(event)=>{event.preventDefault();if(button.hasPointerCapture?.(event.pointerId))button.releasePointerCapture(event.pointerId);if(touchInput.x===coords[direction][0]&&touchInput.y===coords[direction][1])touchInput.x=touchInput.y=0;};
    button.addEventListener('pointerdown',down);button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('pointerleave',up);
  });
  canvas.addEventListener('pointerdown',(event)=>{
    if(scene!=='day')return;const rect=canvas.getBoundingClientRect();const x=(event.clientX-rect.left)*W/rect.width;const y=(event.clientY-rect.top)*H/rect.height;
    const dx=x-player.x,dy=y-player.y;if(Math.hypot(dx,dy)>30){touchInput.x=Math.sign(dx);touchInput.y=Math.sign(dy);window.clearTimeout(canvas._tapTimer);canvas._tapTimer=window.setTimeout(()=>{touchInput.x=touchInput.y=0;},500);}
  });
  window.addEventListener('keydown',(event)=>{
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(event.key))event.preventDefault();
    if(event.key==='Escape'){if(scene==='day')returnToShore();else if(scene==='night'){ui.night.hidden=true;scene='night';}}
    if(event.key===' '&&!event.repeat)catchNearby();
    keys.add(event.key);
  });
  window.addEventListener('keyup',(event)=>keys.delete(event.key));
  window.addEventListener('blur',()=>keys.clear());
  document.addEventListener('visibilitychange',()=>{lastFrame=0;keys.clear();touchInput.x=touchInput.y=0;});
  $('#score-form').addEventListener('submit',async(event)=>{
    event.preventDefault();const button=ui.scoreForm.querySelector('button');button.disabled=true;button.textContent='Saving…';
    try{const res=await fetch('/api/scores',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({game:GAME,nickname:new FormData(ui.scoreForm).get('nickname'),score:haul})});if(!res.ok)throw Error();ui.scoreForm.hidden=true;toast('Your basket is on the board!');await loadScores();}
    catch{toast('The board is resting; try again later.');}
    finally{button.disabled=false;button.innerHTML='Save basket <span>→</span>';}
  });
  setSaveText(); loadScores();
  requestAnimationFrame(step);
})();
