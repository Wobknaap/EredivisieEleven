import {test,expect} from '@playwright/test';
import {amsterdamDay,buildPuzzle,dateSeed,type Player} from '../../src/engine';
import source from '../../src/data/players.json' with {type:'json'};
const players=source as Player[];

test('daily puzzle, real player search, persistence, test mode and return',async({page})=>{
  const day=amsterdamDay();const slot=buildPuzzle(players,dateSeed(day)).find(s=>s.id==='st')!;
  const player=players.find(p=>p.id===slot.answers[0])!;
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Stel je elftal samen'})).toBeVisible();
  await expect(page.locator('.position')).toHaveCount(11);
  await expect(page.getByRole('region',{name:'4-3-3 opstelling'})).toBeVisible();
  await page.getByLabel('Zoek een speler').fill(player.name);
  const pick=page.waitForResponse(r=>r.url().includes('/api/picks')&&r.request().method()==='POST');
  await page.locator(`[data-player-id="${player.id}"]`).click();
  expect((await pick).status()).toBe(200);
  await expect(page.locator('.position.complete')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.position.complete')).toHaveCount(1);
  await page.getByRole('button',{name:'Nieuwe testpuzzel'}).click();
  await expect(page.getByText('Testpuzzel',{exact:true})).toBeVisible();
  await expect(page.locator('.position.complete')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Testpuzzel',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Terug naar vandaag'}).click();
  await expect(page.locator('.position.complete')).toHaveCount(1);
});

test('valid incorrect guess costs one attempt and mobile layout fits',async({page})=>{
  await page.setViewportSize({width:375,height:812});await page.goto('/');
  const wrong=players.find(p=>p.position==='Goalkeeper')!;
  await page.getByLabel('Zoek een speler').fill(wrong.name);
  await page.locator(`[data-player-id="${wrong.id}"]`).click();
  await expect(page.getByText('Niet goed. Je verliest één poging.')).toBeVisible();
  await expect(page.locator('.scoreline strong').nth(1)).toContainText('11');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth',375);
});
