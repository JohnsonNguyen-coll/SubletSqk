export const BLOCK_UNITS = 1_000_000_000n;
const WORK_SCALE = 1_000_000_000_000n;
export const SQK_SCALE = 1_000_000_000_000_000_000n;

export type IssuanceSchedule = {
  allowance: bigint;
  launchBonus: bigint;
  bonusBlocks: bigint;
  halvingBlocks: bigint;
  firstPeriodRate: bigint;
};

// Official Sepolia release core-sepolia-20261103, revision 7.
// Live issuanceSchedule() replaces these values whenever the RPC is available.
export const PUBLISHED_SCHEDULE: IssuanceSchedule = {
  allowance: 1_890_000_000n * SQK_SCALE,
  launchBonus: 105_000_000n * SQK_SCALE,
  bonusBlocks: 97_020n,
  halvingBlocks: 393_470n,
  firstPeriodRate: 4n * ((1_890_000_000n - 105_000_000n) * SQK_SCALE / (7n * 393_470n)),
};

function min(a: bigint, b: bigint) { return a < b ? a : b; }
function positive(a: bigint) { return a > 0n ? a : 0n; }

/** The cumulative schedule, in SQK base units, from the official SqueekMining rule. */
export function issuedAt(blocksSinceStart: bigint, schedule: IssuanceSchedule): bigint {
  const b = positive(blocksSinceStart);
  const h = schedule.halvingBlocks;
  if (h <= 0n) return 0n;
  const r = schedule.firstPeriodRate;
  const base = r * min(b, h)
    + (r / 2n) * min(positive(b - h), h)
    + (r / 4n) * min(positive(b - 2n * h), h);
  const bonus = schedule.bonusBlocks > 0n
    ? schedule.launchBonus * min(b, schedule.bonusBlocks) / schedule.bonusBlocks : 0n;
  return min(schedule.allowance, base + bonus);
}

export type MiningScenario = {
  workPerRound: number;
  rounds: number;
  difficulty: bigint;
  blockUnits: bigint;
  blocksSinceStart: bigint;
  schedule: IssuanceSchedule;
};

export type RoundResult = {
  round: number;
  difficulty: bigint;
  nextDifficulty: bigint;
  blocks: bigint;
  totalBlocks: bigint;
  issued: bigint;
  progress: bigint;
};

/** Prices each ten-minute round first, then steers difficulty using integer math. */
export function simulateMining(input: MiningScenario) {
  const work = BigInt(Math.max(0, Math.min(10_000, Math.floor(input.workPerRound))));
  const count = Math.max(1, Math.min(144, Math.floor(input.rounds)));
  let difficulty = input.difficulty < 1_000n ? 1_000n : input.difficulty;
  let units = input.blockUnits;
  let issuedBlocks = positive(input.blocksSinceStart);
  let totalIssued = 0n;
  const history: RoundResult[] = [];
  for (let round = 1; round <= count; round++) {
    const beforeHeight = units / BLOCK_UNITS;
    const beforeIssued = issuedAt(issuedBlocks, input.schedule);
    units += work * WORK_SCALE / difficulty;
    const blocks = units / BLOCK_UNITS - beforeHeight;
    issuedBlocks += blocks;
    const nextDifficulty = work >= 40n
      ? (29n * difficulty + work * 1_000n / 40n) / 30n
      : difficulty;
    totalIssued += issuedAt(issuedBlocks, input.schedule) - beforeIssued;
    history.push({round, difficulty, nextDifficulty, blocks,
      totalBlocks: units / BLOCK_UNITS - input.blockUnits / BLOCK_UNITS,
      issued: totalIssued, progress: units % BLOCK_UNITS});
    difficulty = nextDifficulty < 1_000n ? 1_000n : nextDifficulty;
  }
  return {history, workTotal: work * BigInt(count), blocks: history.at(-1)?.totalBlocks ?? 0n,
    issued: totalIssued, finalDifficulty: difficulty, finalProgress: units % BLOCK_UNITS,
    minutes: count * 10};
}
