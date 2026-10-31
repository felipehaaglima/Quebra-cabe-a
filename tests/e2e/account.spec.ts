import { expect, test } from '@playwright/test';
import { DEMO, distributePieces, generatePieces } from '../../src/game/core/puzzle/puzzle';
import { PieceController } from '../../src/game/input/piece-controller';
import { definitionKey } from '../../src/game/persistence/snapshot';
import { toCloudBoard } from '../../src/game/cloud/board';
const A='11111111-1111-4111-8111-111111111111', ID='22222222-2222-4222-8222-222222222222';
function board() {
  const model=new PieceController(generatePieces(DEMO),distributePieces(generatePieces(DEMO),DEMO.seed),DEMO,()=>{});model.setGuideEnabled(false);
  return toCloudBoard({schemaVersion:4,puzzleId:DEMO.id,definitionKey:definitionKey(DEMO),revision:1,savedAt:new Date().toISOString(),model:model.exportModel(),camera:{center:{x:0,y:0},relativeZoom:1,angleRad:0}},DEMO.id);
}
test('contas sem configuração explicam indisponibilidade e preservam jogo sem login',async({page},testInfo)=>{
  await page.goto('/');await page.getByRole('link',{name:'Sua conta',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Sua conta',exact:true})).toBeVisible();
  await expect(page.getByText('A conta na nuvem ainda não está disponível. Sua montagem continua salva neste navegador.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Enviar código'})).toHaveCount(0);
  await page.screenshot({path:testInfo.outputPath('conta-sem-configuracao.png'),fullPage:true});
  await page.getByRole('link',{name:'Voltar à mesa',exact:true}).click();await expect(page.locator('canvas')).toBeVisible();
});
test('interface de conta confirma importação e mantém histórico local',async({page},testInfo)=>{
  // API fixtures exercise UI only; provider/Auth and SQL are verified separately.
  const remoteBoard=board();let logged=false,sent=false,uploaded=false;
  const item={id:ID,puzzleId:DEMO.id,pieces:24,connections:0,createdAt:new Date().toISOString()};
  await page.route('**/api/account',route=>route.fulfill({json:{configured:true,user:logged?{id:A,email:'pessoa@example.test'}:null}}));
  await page.route('**/api/auth',async route=>{
    const body=route.request().postDataJSON();
    if(body.action==='send'){sent=true;await route.fulfill({json:{message:'Código enviado.'}});}
    else if(body.action==='verify'){logged=true;await route.fulfill({json:{message:'Conta conectada.'}});}
    else{logged=false;await route.fulfill({json:{message:'Você saiu da conta.'}});}
  });
  await page.route('**/api/backups',async route=>{
    if(route.request().method()==='POST'){const payload=route.request().postDataJSON();expect(payload.board).not.toHaveProperty('camera');expect(payload.board.model).not.toHaveProperty('localCoinBalance');uploaded=true;await route.fulfill({status:201,json:{item}});}
    else await route.fulfill({json:{items:uploaded?[item]:[],next:null}});
  });
  await page.route('**/api/backups/'+ID,route=>route.fulfill({json:{item,board:remoteBoard}}));
  await page.goto('/play');await expect(page.getByRole('button',{name:'Bolsas',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Ferramentas',exact:true}).click();await expect(page.getByLabel('Salvamento',{exact:true})).toHaveText('Salvo neste navegador.');
  await page.getByRole('link',{name:'Conta e cópias na nuvem'}).click();
  await page.getByLabel('E-mail',{exact:true}).fill('pessoa@example.test');await page.getByRole('button',{name:'Enviar código',exact:true}).click();expect(sent).toBe(true);
  await page.getByLabel('Código do e-mail').fill('123456');await page.getByRole('button',{name:'Confirmar código'}).click();
  await expect(page.getByRole('heading',{name:'Conta conectada'})).toBeVisible();
  await page.getByRole('button',{name:'Guardar cópia de 24 peças'}).click();await expect(page.getByRole('status')).toContainText('Cópia guardada');
  await page.getByRole('button',{name:'Revisar restauração'}).click();await page.getByRole('button',{name:'Manter montagem atual'}).click();
  await expect(page.getByRole('heading',{name:'Histórico deste aparelho'})).toHaveCount(0);
  await page.getByRole('button',{name:'Revisar restauração'}).click();await page.getByRole('button',{name:'Confirmar restauração',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Histórico deste aparelho'})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('copias-e-historico.png'),fullPage:true});
  await page.getByRole('link',{name:'Abrir montagem restaurada'}).click();await expect(page.getByRole('button',{name:'Bolsas',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Guia no tapete'})).toHaveAttribute('aria-pressed','false');
  await page.goto('/account');await expect(page.getByRole('heading',{name:'Conta conectada'})).toBeVisible();
  await page.getByRole('button',{name:'Revisar cópia local'}).click();await page.getByRole('button',{name:'Confirmar restauração',exact:true}).click();
  await page.getByRole('button',{name:'Sair da conta'}).click();await expect(page.getByRole('heading',{name:'Entrar ou criar conta'})).toBeVisible();
  await page.getByRole('link',{name:'Continuar na mesa'}).click();await expect(page.getByRole('button',{name:'Bolsas',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Guia no tapete'})).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
