import test from 'node:test';
import assert from 'node:assert/strict';
import {issuedAt, simulateMining} from '../lib/mining-model.ts';

const schedule = {allowance: 1_000n, launchBonus: 10n, bonusBlocks: 2n,
  halvingBlocks: 10n, firstPeriodRate: 4n};

test('prices a round at old difficulty, then steers the next round', () => {
  const result = simulateMining({workPerRound: 80, rounds: 1,
    difficulty: 10_000n, blockUnits: 1_700_000_000n,
    blocksSinceStart: 0n, schedule});
  assert.equal(result.blocks, 8n);
  assert.equal(result.finalProgress, 700_000_000n);
  assert.equal(result.finalDifficulty, 9_733n);
  assert.equal(result.issued, 42n); // 8 × 4 base + 10 launch bonus.
});

test('quiet rounds add progress without changing difficulty', () => {
  const result = simulateMining({workPerRound: 39, rounds: 1,
    difficulty: 10_000n, blockUnits: 0n, blocksSinceStart: 0n, schedule});
  assert.equal(result.blocks, 3n);
  assert.equal(result.finalDifficulty, 10_000n);
});

test('partial block progress carries into a new block', () => {
  const result = simulateMining({workPerRound: 1, rounds: 1,
    difficulty: 1_000n, blockUnits: 900_000_000n,
    blocksSinceStart: 0n, schedule});
  assert.equal(result.blocks, 1n);
  assert.equal(result.finalProgress, 900_000_000n);
});

test('issuance bonus and three halving periods stop at the schedule end', () => {
  assert.equal(issuedAt(0n, schedule), 0n);
  assert.equal(issuedAt(1n, schedule), 9n);
  assert.equal(issuedAt(2n, schedule), 18n);
  assert.equal(issuedAt(10n, schedule), 50n);
  assert.equal(issuedAt(20n, schedule), 70n);
  assert.equal(issuedAt(30n, schedule), 80n);
  assert.equal(issuedAt(100n, schedule), 80n);
});

test('zero work produces no blocks or future issuance', () => {
  const result = simulateMining({workPerRound: 0, rounds: 12,
    difficulty: 10_875n, blockUnits: 0n, blocksSinceStart: 0n, schedule});
  assert.equal(result.blocks, 0n);
  assert.equal(result.issued, 0n);
  assert.equal(result.finalDifficulty, 10_875n);
});
