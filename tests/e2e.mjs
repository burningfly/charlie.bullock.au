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
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let submitted = null;
  await page.route('**/api/scores**', async (route) => {
    if (route.request().method() === 'POST') {
      submitted = route.request().postDataJSON();
      await route.fulfill({ json: { saved: true } });
    } else {
      await route.fulfill({ json: { scores: [] } });
    }
  });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  if ((await page.title()) !== "Reefkeeper — Charlie's Game Lab") throw new Error('Game title was not rendered.');
  if (!(await page.locator('#game-canvas').isVisible())) throw new Error('Game canvas is missing.');
  await page.screenshot({ path: '/tmp/reefkeeper-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /Start the dive/ }).click();
  await page.locator('#game-canvas').screenshot({ path: '/tmp/reefkeeper-dive.png' });
  if(await page.locator('#game-canvas').getAttribute('data-swimmer-state')!=='floating')throw Error('The diver should begin floating.');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => Number(document.querySelector('#game-canvas').dataset.playerPosition?.split(',')[0]) >= 270);
  if(await page.locator('#game-canvas').getAttribute('data-swimmer-state')!=='swimming')throw Error('Movement did not start the swim cycle.');
  const activeFrame=await page.locator('#game-canvas').getAttribute('data-swimmer-frame');
  await page.waitForFunction(frame=>document.querySelector('#game-canvas').dataset.swimmerFrame!==frame,activeFrame);
  await page.keyboard.up('ArrowRight');
  await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.swimmerState==='floating');
  await page.waitForTimeout(250);
  if(await page.locator('#game-canvas').getAttribute('data-swimmer-frame')!=='2')throw Error('The stopped diver kept swimming instead of holding the float pose.');
  await page.locator('#game-canvas').screenshot({ path: '/tmp/reefkeeper-after-move.png' });
  await page.keyboard.press('Space');
  if ((await page.locator('#haul-count').textContent()).trim() !== '1') throw new Error(`The diver could not catch the nearby fish (air ${await page.locator('#air-value').textContent()}, phase ${await page.locator('#phase-label').textContent()}, errors ${errors.join('; ')}).`);
  await page.keyboard.down('ArrowDown');
  await page.waitForFunction(() => Number(document.querySelector('#game-canvas').dataset.playerPosition?.split(',')[1]) >= 385);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.press('Space');
  if (!(await page.locator('#toast').textContent()).includes('shell charm')) throw new Error(`The diver could not find the keepsake at ${await page.locator('#game-canvas').getAttribute('data-player-position')}: ${await page.locator('#toast').textContent()}`);
  const haulBeforeReturn = Number((await page.locator('#haul-count').textContent()).trim());
  await page.keyboard.press('Escape');
  if (!(await page.locator('#night-overlay').isVisible())) throw new Error('Returning to shore did not open the night scene.');
  await page.locator('#game-canvas').screenshot({path:'/tmp/reefkeeper-village.png'});
  await page.locator('#share-button').click({ timeoutMs: 5000 });
  if (!(await page.locator('#pantry-copy').textContent()).includes('lit the kitchen lantern')) throw new Error('Sharing fish did not update the village.');
  await page.getByRole('button', { name: 'Talk to the villagers' }).click();
  await page.getByRole('button', { name: 'Talk to the villagers' }).click();
  await page.getByRole('button', { name: 'Talk to the villagers' }).click();
  if (!(await page.locator('#quest-note').textContent()).includes('Piko’s shell charm is back')) throw new Error('Returning the keepsake did not complete the villager request.');
  await page.locator('#nickname').fill('Reef Tester');
  await page.getByRole('button', { name: /Save basket/ }).click();
  await page.waitForFunction(() => document.querySelector('#score-list').textContent.includes('No big baskets yet') || document.querySelector('#score-list').textContent.includes('Reef Tester'));
  if (!submitted || submitted.game !== 'reefkeeper' || submitted.score !== haulBeforeReturn || submitted.nickname !== 'Reef Tester') throw new Error(`Leaderboard submitted unexpected score data: ${JSON.stringify(submitted)}`);
  await page.getByRole('button', { name: /Rest until morning/ }).click();
  if (!(await page.locator('#day-label').textContent()).includes('2')) throw new Error('Resting did not advance to the next day.');
  await page.waitForFunction(() => document.querySelector('#phase-label').textContent === 'REEF DIVE');
  const dayTwoStart = await page.locator('#game-canvas').getAttribute('data-player-position');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowRight');
  const dayTwoMove = await page.locator('#game-canvas').getAttribute('data-player-position');
  if (dayTwoMove === dayTwoStart) throw new Error('The next day started without an active dive.');
  const destinationCanvas=await page.locator('#game-canvas').boundingBox();
  await page.locator('#game-canvas').click({position:{x:destinationCanvas.width*360/960,y:destinationCanvas.height*220/540}});
  await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.swimmerState==='swimming');
  await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.swimmerState==='floating');
  await page.keyboard.press('Escape');
  await page.reload({ waitUntil: 'networkidle' });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('reefkeeper-save')));
  if (saved.day !== 2 || saved.sharedFish !== haulBeforeReturn || saved.shells !== haulBeforeReturn + 2 || !saved.keepsakeReturned) throw new Error(`Progress did not persist correctly: ${JSON.stringify(saved)}`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  const touchControls = page.locator('.touch-controls');
  if (!(await touchControls.isVisible())) throw new Error('Touch controls are not visible at mobile width.');
  const canvasBox = await page.locator('#game-canvas').boundingBox();
  if (!canvasBox || canvasBox.width > 390 || canvasBox.width < 300) throw new Error('The game canvas does not fit the mobile viewport.');
  await page.getByRole('button', { name: /Start the dive/ }).click();
  const startMobilePosition = await page.locator('#game-canvas').getAttribute('data-player-position');
  const rightButton = await page.getByRole('button', { name: 'Swim right' }).boundingBox();
  await page.mouse.move(rightButton.x + rightButton.width / 2, rightButton.y + rightButton.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => Number(document.querySelector('#game-canvas').dataset.playerPosition?.split(',')[0]) >= 270);
  if(await page.locator('#game-canvas').getAttribute('data-swimmer-state')!=='swimming')throw Error('Touch input did not start swimming.');
  await page.mouse.up();
  await page.waitForFunction(()=>document.querySelector('#game-canvas').dataset.swimmerState==='floating');
  const movedMobilePosition = await page.locator('#game-canvas').getAttribute('data-player-position');
  if (movedMobilePosition === startMobilePosition) throw new Error('The touch direction pad did not move the diver.');
  await page.getByRole('button', { name: /CATCH/ }).click();
  if ((await page.locator('#haul-count').textContent()).trim() !== '1') throw new Error('The touch catch button did not catch a nearby fish.');
  const offlinePage = await context.newPage();
  await offlinePage.route('**/api/scores**', (route) => route.abort());
  await offlinePage.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await offlinePage.getByText('Score board is taking a rest. Your adventure still works!').waitFor();
  await offlinePage.getByRole('button', { name: /Start the dive/ }).click();
  if (!(await offlinePage.locator('#game-canvas').isVisible())) throw new Error('The game did not start while the score API was unavailable.');
  if (errors.length) throw new Error(`Browser errors: ${errors.join('; ')}`);
  console.log('E2E passed: catch, keepsake request, safe return, village recovery, leaderboard submit, next day, local save, mobile controls, and offline scoreboard.');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  const exited = server.exitCode !== null ? Promise.resolve() : new Promise((resolve) => server.once('exit', resolve));
  await Promise.race([exited, delay(1500)]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
