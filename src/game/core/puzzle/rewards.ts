import { puzzleProgress, type PuzzleState } from './groups';
import type { PuzzleDefinition } from './puzzle';

export type RewardEntry = { key: string; amount: number };
export const rewardRules = (definition: PuzzleDefinition) => ({ connection: 1, completion: definition.rows * definition.columns > 24 ? 30 : 20 });
export function claimRewards(state: PuzzleState, definition: PuzzleDefinition, ledger: readonly RewardEntry[]) {
  const claimed = new Set(ledger.map((entry) => entry.key));
  const rules = rewardRules(definition);
  const eligible = state.confirmedConnections.map((id) => ({ key: `connection:${id}`, amount: rules.connection }));
  if (puzzleProgress(state, definition).completed) eligible.push({ key: 'completion', amount: rules.completion });
  const added = eligible.filter((entry) => !claimed.has(entry.key));
  return { ledger: [...ledger, ...added], earned: added.reduce((sum, entry) => sum + entry.amount, 0) };
}
