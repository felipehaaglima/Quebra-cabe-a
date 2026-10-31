import { ready } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { DEMO, DEMO48, generatePieces, distributePieces } from '../../src/game/core/puzzle/puzzle';
import { canonicalCenter } from '../../src/game/core/puzzle/groups';
import { centerCamera, worldToScreen, type Vec2 } from '../../src/game/core/camera/camera';

async function gesture(page: Page, from: Vec2, to: Vec2, touch: boolean, during?: () => Promise<void>, cancel = false) {
  if (touch) {
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...from }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, ...to }] });
    await during?.();
    await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] }); await session.detach();
  } else {
    await page.mouse.move(from.x,from.y); await page.mouse.down(); await page.mouse.move(to.x,to.y,{steps: 4}); await during?.();
    if (cancel) await page.locator('canvas').dispatchEvent('pointercancel', { pointerId: 1 });
    await page.mouse.up();
  }
}
for (const definition of [DEMO,DEMO48]) test(`reservas neutras ${definition.rows * definition.columns}: tentativa, retorno e encaixe com câmera girada`,async ({page,isMobile},testInfo) => {
  const count = definition.rows * definition.columns;
  await page.goto(count===48 ? '/play?pieces=48' : '/play'); await ready(page);
  const toggle = page.getByRole('button',{name:'Guia no tapete'}), canvas = page.locator('canvas'), hint=page.getByLabel('Ajuda do tapete');
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:testInfo.outputPath('reservas-sem-imagem.png'),fullPage:true});
  const initial=distributePieces(generatePieces(definition),definition.seed);
  const box=(await canvas.boundingBox())!, viewport={width:box.width,height:box.height}, camera=centerCamera(viewport);
  const point=(p:Vec2)=>{const v=worldToScreen(p,camera,viewport);return {x:v.x+box.x,y:v.y+box.y};};
  const selection=page.getByLabel('Selecionar peça');
  const orient=async (index:number)=> { await selection.selectOption(initial[index].pieceId); for(let i=0;i<(4-initial[index].quarterTurn)%4;i++)await page.getByRole('button',{name:'Girar peça',exact:true}).click(); };
  await orient(0);
  const wrong=canonicalCenter('0:1',definition);
  await gesture(page,point(initial[0].center),point(wrong),isMobile,async()=>{
    await expect(hint).toHaveText('Solte para tentar neste espaço.');
    await page.screenshot({path:testInfo.outputPath('tentativa-amarela-errada.png'),fullPage:true});
  });
  await expect(hint).toContainText('local anterior');
  // Retry from the original location: a failed drop must not have moved it.
  const first=canonicalCenter('0:0',definition);
  await gesture(page,point(initial[0].center),point({x:first.x+definition.imageWidth/definition.columns*0.4,y:first.y+definition.imageHeight/definition.rows*0.4}),isMobile,async()=>{
    await expect(hint).toHaveText('Solte para tentar neste espaço.');
    await page.screenshot({path:testInfo.outputPath('tentativa-amarela-certa.png'),fullPage:true});
  });
  await expect(selection).toHaveValue('0:0');
  await expect(page.getByLabel('Moedas locais')).toHaveText('◉ 0');
  // A whole group rejects an invalid mat cell without losing its connections.
  const turns=isMobile?1:3;
  for(let i=0;i<turns;i++)await page.getByRole('button',{name:'Girar 90°',exact:true}).click();
  await page.getByRole('button',{name:'Diminuir zoom'}).click(); await page.getByRole('button',{name:'Diminuir zoom'}).click();
  camera.angleRad=turns*Math.PI/2;camera.zoom*=0.64;
  await orient(1); const second=canonicalCenter('0:1',definition);
  await gesture(page,point(initial[1].center),point(second),isMobile);
  await expect(page.getByRole('button',{name:'Girar grupo'})).toBeVisible();
  const expected=definition.rows*(definition.columns-1)+definition.columns*(definition.rows-1);
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText(`1 de ${expected} encaixes · ${count-1} grupos`);
  await gesture(page,point(second),point(canonicalCenter('1:1',definition)),isMobile);
  await expect(hint).toContainText('local anterior');
  await expect(page.getByLabel('Moedas locais')).toHaveText('◉ 1');
  // Original group is still available to pick up after rejection.
  await gesture(page,point(second),point({x:650,y:0}),isMobile);
  await expect(page.getByRole('button',{name:'Girar grupo'})).toBeVisible();
  await page.reload();await ready(page);await expect(toggle).toHaveAttribute('aria-pressed','true');
  await expect(page.getByLabel('Progresso do puzzle')).toHaveText(`1 de ${expected} encaixes · ${count-1} grupos`);
});

test('tentativa inválida de peça retirada retorna à bolsa mesmo após recarregar',async ({page,isMobile},testInfo)=>{
  await page.goto('/play');await ready(page);
  await page.getByRole('button',{name:'Bolsas',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Bolsas'});
  await panel.getByLabel('Peça para guardar').selectOption('0:0');await panel.getByRole('button',{name:'Guardar seleção',exact:true}).click();
  await panel.getByRole('button',{name:'Retirar Peça 1',exact:true}).click();await panel.getByRole('button',{name:'Fechar bolsas'}).click();
  await expect(page.getByLabel('Salvamento',{exact:true})).toHaveText('Salvo neste navegador.');await page.reload();await ready(page);
  await page.getByLabel('Selecionar peça').selectOption('0:0');
  const initial=distributePieces(generatePieces(DEMO),DEMO.seed)[0];
  for(let i=0;i<(4-initial.quarterTurn)%4;i++)await page.getByRole('button',{name:'Girar peça',exact:true}).click();
  const canvas=page.locator('canvas'),box=(await canvas.boundingBox())!,viewport={width:box.width,height:box.height},camera=centerCamera(viewport);
  const point=(p:Vec2)=>{const v=worldToScreen(p,camera,viewport);return {x:v.x+box.x,y:v.y+box.y};};
  await gesture(page,point({x:-390,y:270}),point(canonicalCenter('0:1',DEMO)),isMobile);
  await expect(page.getByLabel('Ajuda do tapete')).toContainText('devolvida à bolsa');
  await expect(canvas).toHaveAttribute('data-visible-pieces','23');
  await page.getByRole('button',{name:'Bolsas',exact:true}).click();await expect(panel.getByRole('button',{name:'Bordas (1)',exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('retorno-a-bolsa.png'),fullPage:true});
  await panel.getByRole('button',{name:'Fechar bolsas'}).click();
  await expect(page.getByLabel('Salvamento',{exact:true})).toHaveText('Salvo neste navegador.');await page.reload();await ready(page);
  await expect(canvas).toHaveAttribute('data-visible-pieces','23');await expect(page.getByLabel('Moedas locais')).toHaveText('◉ 0');
});
