import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { DEMO, DEMO48, generatePieces, distributePieces } from '../../src/game/core/puzzle/puzzle';
import { PieceController } from '../../src/game/input/piece-controller';
import { definitionKey, type LocalSave } from '../../src/game/persistence/snapshot';
import { decodeBoard, restoreBoard, toCloudBoard } from '../../src/game/cloud/board';
import { PuzzleDatabase } from '../../src/game/persistence/local-save';
import { restoreCloudCopy, restoreArchive } from '../../src/game/cloud/local-copies';
function saved(definition = DEMO): LocalSave {
  const model = new PieceController(generatePieces(definition),distributePieces(generatePieces(definition),definition.seed),definition,()=>{});
  return {schemaVersion:4,puzzleId:definition.id,definitionKey:definitionKey(definition),revision:1,savedAt:new Date().toISOString(),model:model.exportModel(),camera:{center:{x:100,y:100},relativeZoom:2,angleRad:Math.PI/2}};
}
for (const definition of [DEMO,DEMO48]) it(`cópia de ${definition.rows*definition.columns} remove câmera, preferências e moedas e valida inventário`,()=>{
  const original=saved(definition), board=toCloudBoard(original,definition.id);
  expect(board).not.toHaveProperty('camera'); expect(board.model).not.toHaveProperty('preferences'); expect(board.model).not.toHaveProperty('localCoinBalance'); expect(board.model).not.toHaveProperty('rewardLedger');
  expect(restoreBoard(board).model.state).toEqual(original.model.state);
  expect(()=>decodeBoard({...board,model:{...board.model,localCoinBalance:10000}})).toThrow();
  expect(()=>decodeBoard({...board,model:{...board.model,order:[]}})).toThrow();
});
it('restauração arquiva a montagem anterior e permite recuperá-la sem destruir a cópia atual',async()=>{
  const db=new PuzzleDatabase('restore-cloud-test');
  try {
    const old=saved();old.model.preferences.muted=true;await db.saves.put(old);
    const remote=saved();remote.model.guideEnabled=false;
    const board=toCloudBoard(remote,DEMO.id);
    await restoreCloudCopy(board,1,db);
    const restored=await db.saves.get(DEMO.id);expect(restored?.model.guideEnabled).toBe(false);expect(restored?.model.preferences.muted).toBe(true);expect(restored?.camera.center).toEqual({x:0,y:0});
    const history=await db.archives.toArray();expect(history).toHaveLength(1);expect(history[0].save).toEqual(old);
    const current=(await db.saves.get(DEMO.id))!;current.model.rewardLedger=[{key:'connection:0:0|0:1',amount:1}];current.model.localCoinBalance=1;await db.saves.put(current);
    await restoreArchive(history[0].id!,2,db);expect((await db.saves.get(DEMO.id))?.model.localCoinBalance).toBe(1);expect((await db.saves.get(DEMO.id))?.model.guideEnabled).toBe(true);expect(await db.archives.count()).toBe(2);
  }finally{await db.delete();}
});
it('conflito com outra aba e save incompatível preservam o registro anterior',async()=>{
  const db=new PuzzleDatabase('restore-conflict-test');
  try {
    const old=saved(), board=toCloudBoard(old,DEMO.id);await db.saves.put(old);
    await expect(restoreCloudCopy(board,null,db)).rejects.toThrow('outra aba');expect(await db.archives.count()).toBe(0);expect(await db.saves.get(DEMO.id)).toEqual(old);
    const future={...old,schemaVersion:99};await db.saves.put(future as never);
    await expect(restoreCloudCopy(board,1,db)).rejects.toThrow();expect(await db.archives.count()).toBe(0);expect(await db.saves.get(DEMO.id)).toEqual(future);
  }finally{await db.delete();}
});
