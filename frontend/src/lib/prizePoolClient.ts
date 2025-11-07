import type { ApiPromise } from "@polkadot/api";
import type { InjectedExtension } from "@polkadot/extension-inject/types";
import { BN } from "@polkadot/util";

import {
  ENTRY_FEE,
  PRIZE_POOL_ADDRESS,
  REVEAL_WINDOW_BLOCKS,
  USE_MOCK,
} from "../config";
import type { WalletAccount } from "../types/wallet";
import { disconnectApi, getApi, getPrizePoolContract, withSigner } from "./polkadot";
import { safeToBigInt } from "./safeBigInt";

export interface PoolInfo {
  poolBalance: bigint;
  rakeBalance: bigint;
  entryCount: number;
  drawId: number;
  isPaused: boolean;
}

export interface Entry {
  player: string;
  entryFee: bigint;
  drawId: number;
  blockNumber: number;
}

export interface Draw {
  drawId: number;
  winner: string | null;
  prizeAmount: bigint;
  entryCount: number;
  executedAtBlock: number | null;
}

export class PrizePoolClient {
  private api: ApiPromise | null = null;

  async init() {
    if (!PRIZE_POOL_ADDRESS) {
      throw new Error(
        "VITE_PRIZE_POOL_ADDRESS is missing; cannot initialize prize pool client.",
      );
    }

    this.api = await getApi();
    await getPrizePoolContract();
  }

  async ensureApi() {
    if (!this.api) {
      await this.init();
    }
    return this.api!;
  }

  async getBlockNumber(): Promise<number> {
    const api = await this.ensureApi();
    const header = await api.rpc.chain.getHeader();
    return header.number.toNumber();
  }

  async getPoolInfo(): Promise<PoolInfo> {
    if (USE_MOCK) {
      return {
        poolBalance: 0n,
        rakeBalance: 0n,
        entryCount: 0,
        drawId: 0,
        isPaused: false,
      };
    }

    const contract = await getPrizePoolContract();
    const result = await contract.query.getPoolInfo(
      contract.address,
      { value: 0, gasLimit: -1 },
    );

    if (result.result.isErr) {
      throw new Error(`Query failed: ${result.result.asErr.toString()}`);
    }

    const value = result.output.toHuman() as any;
    return {
      poolBalance: safeToBigInt(value.poolBalance ?? value.pool_balance ?? 0) ?? 0n,
      rakeBalance: safeToBigInt(value.rakeBalance ?? value.rake_balance ?? 0) ?? 0n,
      entryCount: Number(value.entryCount ?? value.entry_count ?? 0),
      drawId: Number(value.drawId ?? value.draw_id ?? 0),
      isPaused: Boolean(value.isPaused ?? value.is_paused ?? false),
    };
  }

  async enterJackpot(
    account: WalletAccount,
    extension: InjectedExtension,
    entryFee: bigint,
  ): Promise<bigint> {
    if (USE_MOCK) {
      return entryFee;
    }

    const contract = await getPrizePoolContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = -1;
    const value = BN.from(entryFee.toString());

    const tx = contract.tx.enterJackpot(
      { value, gasLimit },
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(account.address, { signer }, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          for (const event of events) {
            if (event.event.method === "ExtrinsicSuccess") {
              resolve(entryFee);
              return;
            }
            if (event.event.method === "ExtrinsicFailed") {
              reject(new Error("Transaction failed"));
              return;
            }
          }
        }
      }).catch(reject);
    });
  }

  async claimPrize(
    account: WalletAccount,
    extension: InjectedExtension,
    drawId: number,
  ): Promise<bigint> {
    if (USE_MOCK) {
      return 1000000000000n;
    }

    const contract = await getPrizePoolContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = -1;

    const tx = contract.tx.claimPrize(
      { gasLimit },
      drawId,
    );

    return new Promise((resolve, reject) => {
      tx.signAndSend(account.address, { signer }, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          for (const event of events) {
            if (event.event.method === "ExtrinsicSuccess") {
              // Try to extract prize amount from events
              resolve(1000000000000n); // Placeholder
              return;
            }
            if (event.event.method === "ExtrinsicFailed") {
              reject(new Error("Transaction failed"));
              return;
            }
          }
        }
      }).catch(reject);
    });
  }

  async getUserEntries(account: WalletAccount): Promise<Entry[]> {
    if (USE_MOCK) {
      return [];
    }

    // This would require indexing events or storing entry IDs per user
    // For MVP, we'll query events
    const api = await this.ensureApi();
    const entries: Entry[] = [];

    // Query recent events for EntrySubmitted
    // Note: This is simplified - in production, use an indexer
    const events = await api.query.system.events();

    for (const record of events) {
      const { event } = record;
      if (event.section === "contracts" && event.method === "ContractEmitted") {
        // Parse contract event
        // Simplified - would need proper event parsing
      }
    }

    return entries;
  }

  async getDraw(drawId: number): Promise<Draw | null> {
    if (USE_MOCK) {
      return null;
    }

    const contract = await getPrizePoolContract();
    const result = await contract.query.getDraw(
      contract.address,
      { value: 0, gasLimit: -1 },
      drawId,
    );

    if (result.result.isErr) {
      return null;
    }

    const value = result.output.toHuman() as any;
    return {
      drawId: Number(value.drawId ?? value.draw_id ?? drawId),
      winner: value.winner ? String(value.winner) : null,
      prizeAmount: safeToBigInt(value.prizeAmount ?? value.prize_amount ?? 0) ?? 0n,
      entryCount: Number(value.entryCount ?? value.entry_count ?? 0),
      executedAtBlock: value.executedAtBlock ?? value.executed_at_block ?? null,
    };
  }

  subscribeBlocks(callback: (block: number) => void): Promise<() => void> {
    return new Promise(async (resolve) => {
      const api = await this.ensureApi();
      const unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
        callback(header.number.toNumber());
      });
      resolve(() => unsubscribe());
    });
  }

  subscribeEvents(callback: (event: any) => void): Promise<() => void> {
    return new Promise(async (resolve) => {
      const api = await this.ensureApi();
      const unsubscribe = await api.query.system.events((events) => {
        for (const record of events) {
          const { event } = record;
          if (event.section === "contracts") {
            callback({
              name: event.method,
              args: event.data,
            });
          }
        }
      });
      resolve(() => unsubscribe());
    });
  }

  async executeDraw(
    account: WalletAccount,
    extension: InjectedExtension,
  ): Promise<void> {
    if (USE_MOCK) {
      return;
    }

    const contract = await getPrizePoolContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = -1;

    const tx = contract.tx.executeDraw({ gasLimit });

    return new Promise((resolve, reject) => {
      tx.signAndSend(account.address, { signer }, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          for (const event of events) {
            if (event.event.method === "ExtrinsicSuccess") {
              resolve();
              return;
            }
            if (event.event.method === "ExtrinsicFailed") {
              reject(new Error("Transaction failed"));
              return;
            }
          }
        }
      }).catch(reject);
    });
  }

  async withdrawRake(
    account: WalletAccount,
    extension: InjectedExtension,
  ): Promise<bigint> {
    if (USE_MOCK) {
      return 0n;
    }

    const contract = await getPrizePoolContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = -1;

    const tx = contract.tx.withdrawRake({ gasLimit });

    return new Promise((resolve, reject) => {
      tx.signAndSend(account.address, { signer }, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          for (const event of events) {
            if (event.event.method === "ExtrinsicSuccess") {
              resolve(0n); // Would extract from events in production
              return;
            }
            if (event.event.method === "ExtrinsicFailed") {
              reject(new Error("Transaction failed"));
              return;
            }
          }
        }
      }).catch(reject);
    });
  }

  async setPaused(
    account: WalletAccount,
    extension: InjectedExtension,
    paused: boolean,
  ): Promise<void> {
    if (USE_MOCK) {
      return;
    }

    const contract = await getPrizePoolContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = -1;

    const tx = contract.tx.setPaused({ gasLimit }, paused);

    return new Promise((resolve, reject) => {
      tx.signAndSend(account.address, { signer }, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          for (const event of events) {
            if (event.event.method === "ExtrinsicSuccess") {
              resolve();
              return;
            }
            if (event.event.method === "ExtrinsicFailed") {
              reject(new Error("Transaction failed"));
              return;
            }
          }
        }
      }).catch(reject);
    });
  }

  async setRakeBps(
    account: WalletAccount,
    extension: InjectedExtension,
    rakeBps: number,
  ): Promise<void> {
    if (USE_MOCK) {
      return;
    }

    const contract = await getPrizePoolContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = -1;

    const tx = contract.tx.setRakeBps({ gasLimit }, rakeBps);

    return new Promise((resolve, reject) => {
      tx.signAndSend(account.address, { signer }, ({ status, events }) => {
        if (status.isInBlock || status.isFinalized) {
          for (const event of events) {
            if (event.event.method === "ExtrinsicSuccess") {
              resolve();
              return;
            }
            if (event.event.method === "ExtrinsicFailed") {
              reject(new Error("Transaction failed"));
              return;
            }
          }
        }
      }).catch(reject);
    });
  }
}

