import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const root = new URL('../', import.meta.url).pathname;
const baseURL = 'http://127.0.0.1:8788';
const server = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'pages', 'dev', 'public', '--port', '8788', '--compatibility-date=2026-05-03'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
server.stdout.on('data', (chunk) => { serverOutput += chunk.toString(); });
server.stderr.on('data', (chunk) => { serverOutput += chunk.toString(); });
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview server exited early:\n${serverOutput}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch { /* Wait for Wrangler to start. */ }
    await delay(500);
  }
  throw new Error(`Preview server did not start:\n${serverOutput}`);
}

try {
  await waitForServer();
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1365,height:900}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let submitted;
  await page.route('**/api/scores**',async route=>{if(route.request().method()==='POST')submitted=route.request().postDataJSON();await route.fulfill({json:{scores:[],saved:true}});});
  const canvas=page.locator('#game-canvas');
  const waitScene=scene=>page.waitForFunction(s=>document.querySelector('#game-canvas')?.dataset.scene===s,scene);
  async function dismiss(){if(await page.locator('#conversation').isVisible())await page.locator('#conversation-close').click();if(await page.locator('#action-panel').isVisible())await page.locator('#action-close').click();}
  async function walkTo(x){await dismiss();await waitScene('village');await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.villagePosition);const start=Number(await canvas.getAttribute('data-village-position'));if(Math.abs(start-x)<8)return;const key=x>start?'ArrowRight':'ArrowLeft';await canvas.focus();await page.keyboard.down(key);await page.waitForFunction(({x,start})=>{const current=Number(document.querySelector('#game-canvas').dataset.villagePosition);return x>start?current>=x:current<=x;},{x,start});await page.keyboard.up(key);await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.walkerState==='standing');}
  async function enter(x,room){await walkTo(x);if(!(await canvas.getAttribute('data-interact-prompt')).includes('Enter'))throw Error('No contextual enter prompt near door');await page.keyboard.press('Space');await page.waitForFunction(r=>document.querySelector('#game-canvas').dataset.room===r,room);}
  async function leave(){await dismiss();await page.getByRole('button',{name:'Leave building'}).click();await waitScene('village');}
  async function fresh(seed){await page.evaluate(seed=>{if(seed)localStorage.setItem('reefkeeper-save',JSON.stringify(seed));else localStorage.removeItem('reefkeeper-save');},seed);await page.reload({waitUntil:'networkidle'});await page.locator('#start-button').click();}
  await page.goto(baseURL,{waitUntil:'networkidle'});await page.locator('#start-button').click();
  await page.keyboard.down('ArrowRight');await page.waitForFunction(()=>Number(document.querySelector('#game-canvas').dataset.playerPosition?.split(',')[0])>=270);
  if(await canvas.getAttribute('data-swimmer-state')!=='swimming')throw Error('Swim input did not animate');
  await page.keyboard.up('ArrowRight');await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.swimmerState==='floating');
  if(await canvas.getAttribute('data-swimmer-texture')!=='diver-float')throw Error('Idle texture missing');
  await page.keyboard.press('Space');if(await page.locator('#haul-count').textContent()!=='1')throw Error('Catch failed');
  await page.keyboard.down('ArrowDown');await page.waitForFunction(()=>Number(document.querySelector('#game-canvas').dataset.playerPosition.split(',')[1])>=385);await page.keyboard.up('ArrowDown');await page.keyboard.press('Space');
  if(!(await page.locator('#toast').textContent()).includes('shell charm'))throw Error('Charm pickup failed');
  await page.keyboard.press('Escape');await waitScene('village');
  if(await page.locator('#night-overlay button, #night-overlay a, #night-overlay input').count())throw Error('Quest log still contains controls');
  if(await canvas.getAttribute('data-merchant-present')!=='false')throw Error('Merchant should be absent on day1');
  await walkTo(80);if(await canvas.getAttribute('data-interact-prompt'))throw Error('Space hint shown out of range');
  // Click the kitchen facade from a distance: walk over before entering.
  const box=await canvas.boundingBox();await canvas.click({position:{x:box.width*340/960,y:box.height*310/540}});
  await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.room==='kitchen');
  await page.getByRole('button',{name:'Share supper',exact:true}).click();await dismiss();
  if(!(await page.locator('#pantry-copy').textContent()).includes('lit the kitchen lantern'))throw Error('Sharing supper did not update village');
  await page.getByRole('button',{name:'Talk to Malia',exact:true}).click();if(!(await page.locator('#conversation').isVisible()))throw Error('Conversation missing');await leave();
  await walkTo(1600);if(!(await canvas.getAttribute('data-interact-prompt')).includes('Talk'))throw Error('No talk hint near Piko');await page.keyboard.press('Space');
  await page.waitForFunction(()=>document.querySelector('#quest-note').textContent.includes('Piko’s shell charm is back'));await dismiss();
  await page.locator('#nickname').fill('Reef Tester');await page.getByRole('button',{name:/Save basket/}).click();await page.waitForTimeout(100);
  if(submitted?.score!==1||submitted?.game!=='reefkeeper')throw Error('Score submission failed');
  await enter(680,'home');await page.getByRole('button',{name:'Rest until morning'}).click();await waitScene('reef');
  if(await page.locator('#day-label').textContent()!=='DAY 2')throw Error('Rest did not advance day');
  await page.keyboard.press('Escape');await waitScene('village');
  if(await canvas.getAttribute('data-merchant-present')!=='true')throw Error('Merchant missing on market day');
  await walkTo(1320);await page.keyboard.press('Space');
  if(!(await page.locator('#canvas-wrap [data-upgrade="spearGun"]').isVisible()))throw Error('Shop is not inside game');
  await page.locator('[data-upgrade="spearGun"]').click();await dismiss();
  if(!(await page.evaluate(()=>JSON.parse(localStorage.getItem('reefkeeper-save')).spearGun)))throw Error('Trading failed');
  await canvas.screenshot({path:'/tmp/reefkeeper-merchant.png'});
  // Seed later progression; every purchase/repair still goes through world encounters.
  await fresh({day:4,sharedFish:20,wood:10,shells:10,keepsakeReturned:true,moonQuest:true});await page.keyboard.press('Escape');await waitScene('village');
  await enter(990,'workshop');await page.getByRole('button',{name:'Plan repairs'}).click();
  for(const id of ['kitchen','home','dock','workshop']){await page.locator('[data-project="'+id+'"]').click();await dismiss();if(id!=='workshop')await page.getByRole('button',{name:'Plan repairs'}).click();}
  if(await page.locator('#wood-count').textContent()!=='0')throw Error('Repair timber balance incorrect');await leave();
  await walkTo(1320);await page.keyboard.press('Space');await page.locator('[data-upgrade="airTank"]').click();await dismiss();
  if(await page.locator('#shell-count').textContent()!=='7')throw Error('Repair discount failed');
  await walkTo(1600);await page.keyboard.press('Space');await page.getByRole('button',{name:'Village celebration',exact:true}).click();await page.locator('#festival-button').click();
  if(!(await page.evaluate(()=>JSON.parse(localStorage.getItem('reefkeeper-save')).celebrated)))throw Error('Celebration did not persist');await dismiss();
  await page.reload({waitUntil:'networkidle'});await page.locator('#start-button').click();await page.keyboard.press('Escape');await waitScene('village');
  if(!JSON.parse(await canvas.getAttribute('data-repairs')).workshop)throw Error('Repairs did not persist');
  const save=await page.evaluate(()=>localStorage.getItem('reefkeeper-save'));await page.locator('#new-game-button').click();await page.locator('#cancel-new-game').click();if(await page.evaluate(()=>localStorage.getItem('reefkeeper-save'))!==save)throw Error('Cancel changed save');
  await page.locator('#new-game-button').click();await page.locator('#confirm-new-game').click();await page.waitForLoadState('networkidle');
  if(await page.locator('#day-label').textContent()!=='DAY 1')throw Error('New game failed');
  await page.setViewportSize({width:390,height:844});await page.locator('#start-button').click();
  const right=page.getByRole('button',{name:'Swim right'});const bounds=await right.boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.waitForFunction(()=>Number(document.querySelector('#game-canvas').dataset.playerPosition?.split(',')[0])>=270);await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.swimmerState==='floating');await page.locator('#touch-catch').click();if(await page.locator('#haul-count').textContent()!=='1')throw Error('Touch catch failed');
  await page.locator('#return-button').click();await waitScene('village');await enter(340,'kitchen');await page.locator('#touch-catch').click();if(!(await page.locator('#conversation').isVisible()))throw Error('Touch talk failed');
  await page.screenshot({path:'/tmp/reefkeeper-world-actions-mobile.png',fullPage:true});
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile overflow');
  if(await page.locator('#night-overlay button').count())throw Error('Log has gameplay buttons');
  const offline=await context.newPage();offline.on('pageerror',e=>errors.push(e.message));await offline.route('**/api/scores**',r=>r.abort());await offline.goto(baseURL,{waitUntil:'networkidle'});await offline.getByText('Score board is taking a rest. Your adventure still works!').waitFor();await offline.locator('#start-button').click();
  if(errors.length)throw Error(errors.join('; '));
  console.log('E2E passed: dive/float, fish/charm, contextual prompts, approach/enter, in-game supper/talk/repairs/rest/trading/celebration, read-only quest log, merchant schedule, persistence/reset, mobile controls, scores/offline.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  const exited = server.exitCode !== null ? Promise.resolve() : new Promise((resolve) => server.once('exit', resolve));
  await Promise.race([exited, delay(1500)]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
