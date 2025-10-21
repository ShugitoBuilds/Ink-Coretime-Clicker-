import type { ApiPromise } from "@polkadot/api";
import type { InjectedExtension } from "@polkadot/extension-inject/types";
import { BN } from "@polkadot/util";

import {
  BASE_RATE,
  CONTRACT_ADDRESS,
  ELASTIC_BOOM_CLAIMS,
  ELASTIC_BOOM_MULTIPLIER,
  MATURITY_BLOCKS,
} from "../config";
import type { PlayerStatus } from "../types/game";
import type { WalletAccount } from "../types/wallet";
import { disconnectApi, getApi, getContract, withSigner } from "./polkadot";

export interface ChainPlayerStatus extends PlayerStatus {
  totalCoresRented: number;
}

const ZERO_BALANCE = BigInt(0);

const toPlayerStatus = (
  account: WalletAccount,
  value: any,
  blockNumber: number,
): PlayerStatus => {
  const fallback: PlayerStatus = {
    address: account.address,
    coresRented: 0,
    totalRewards: ZERO_BALANCE,
    pendingReward: ZERO_BALANCE,
    activeMultiplier: 1,
    boomClaimsRemaining: 0,
    lastClaimBlock: blockNumber,
    lastUpdatedAt: Date.now(),
  };

  if (!value) {
    return fallback;
  }

  try {
    const pendingReward = BigInt(
      value.pendingReward ?? value.pending_reward ?? 0,
    );
    const totalRewards = BigInt(
      value.totalRewards ?? value.total_rewards ?? 0,
    );
    const lastClaimBlock = Number(
      value.lastClaimBlock ?? value.last_claim_block ?? blockNumber,
    );
    return {
      address: account.address,
      coresRented: Number(value.coresRented ?? value.cores_rented ?? 0),
      totalRewards,
      pendingReward,
      activeMultiplier: Number(
        value.activeMultiplier ?? value.active_multiplier ?? 1,
      ),
      boomClaimsRemaining: Number(
        value.boomClaimsRemaining ?? value.boom_claims_remaining ?? 0,
      ),
      lastClaimBlock,
      lastUpdatedAt: Date.now(),
    };
  } catch (_error) {
    return fallback;
  }
};

export class GameClient {
  private api: ApiPromise | null = null;

  async init() {
    if (!CONTRACT_ADDRESS) {
      throw new Error(
        "VITE_CONTRACT_ADDRESS is missing; cannot initialize game client.",
      );
    }

    this.api = await getApi();
    await getContract();
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

  async queryPlayer(
    account: WalletAccount,
  ): Promise<{ status: PlayerStatus; totalCores: number }> {
    const api = await this.ensureApi();
    const contract = await getContract();
    const blockNumber = await this.getBlockNumber();

    const options = {
      gasLimit: api.registry.createType("WeightV2", {
        refTime: new BN(10000000000),
        proofSize: new BN(2000000),
      }),
      storageDepositLimit: null,
      value: 0,
    };

    const checkStatusQuery =
      contract.query["check_status"] ?? contract.query["checkStatus"];

    if (!checkStatusQuery) {
      throw new Error("check_status message not found in metadata.");
    }

    const statusResult = (await checkStatusQuery(
      account.address,
      options,
      account.address,
    )) as any;

    if (statusResult.result?.isErr) {
      throw new Error(statusResult.result.asErr.toString());
    }

    const output = statusResult.output?.toJSON?.();
    const status = toPlayerStatus(account, output, blockNumber);

    const totalCoresQuery =
      contract.query["total_cores_rented"] ??
      contract.query["totalCoresRented"];

    if (!totalCoresQuery) {
      throw new Error("total_cores_rented message not found in metadata.");
    }

    const totalResult = (await totalCoresQuery(
      account.address,
      options,
    )) as any;

    const totalCores = totalResult?.output
      ? Number(totalResult.output.toString())
      : 0;

    return { status, totalCores };
  }

  async rentCore(
    account: WalletAccount,
    extension: InjectedExtension,
  ): Promise<void> {
    const api = await this.ensureApi();
    const contract = await getContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = api.registry.createType("WeightV2", {
      refTime: new BN(20000000000),
      proofSize: new BN(4000000),
    });

    const rentCoreTx = contract.tx["rent_core"] ?? contract.tx["rentCore"];

    const tx = rentCoreTx?.(
      {
        gasLimit,
        storageDepositLimit: null,
        value: 0,
      },
    );

    if (!tx) {
      throw new Error("rent_core message not available in metadata.");
    }

    await tx.signAndSend(
      account.address,
      { signer },
      ({ status, dispatchError }) => {
        if (dispatchError) {
          throw dispatchError;
        }

        if (status.isInBlock || status.isFinalized) {
          return true;
        }

        return undefined;
      },
    );
  }

  async claimReward(
    account: WalletAccount,
    extension: InjectedExtension,
  ): Promise<bigint> {
    const api = await this.ensureApi();
    const contract = await getContract();
    const { signer } = await withSigner(extension, account.address);

    const gasLimit = api.registry.createType("WeightV2", {
      refTime: new BN(25000000000),
      proofSize: new BN(4000000),
    });

    const options = {
      gasLimit,
      storageDepositLimit: null,
      value: 0,
    } as const;

    const claimRewardQuery =
      contract.query["claim_reward"] ?? contract.query["claimReward"];

    if (!claimRewardQuery) {
      throw new Error("claim_reward message not available in metadata.");
    }

    const queryResult = (await claimRewardQuery(
      account.address,
      options,
    )) as any;

    if (queryResult.result?.isErr) {
      throw new Error(queryResult.result.asErr.toString());
    }

    const rewardValue = BigInt(queryResult.output?.toString?.() ?? 0);

    const claimRewardTx =
      contract.tx["claim_reward"] ?? contract.tx["claimReward"];

    if (!claimRewardTx) {
      throw new Error("claim_reward message not available in metadata.");
    }

    const tx = claimRewardTx(options);

    await new Promise<void>((resolve, reject) => {
      tx.signAndSend(
        account.address,
        { signer },
        ({ status, dispatchError }) => {
          if (dispatchError) {
            reject(dispatchError);
            return;
          }

          if (status.isInBlock || status.isFinalized) {
            resolve();
          }
        },
      ).catch(reject);
    });

    return rewardValue;
  }

  async subscribeEvents(
    callback: (event: { name: string; args: Record<string, unknown> }) => void,
  ) {
    const api = await this.ensureApi();
    const contract = await getContract();

    return api.query.system.events((events) => {
      events.forEach((record) => {
        const { event } = record;
        if (event.section === "contracts" && event.method === "ContractEmitted") {
          const [address, data] = event.data;
          if (address?.toString() !== CONTRACT_ADDRESS) return;

          try {
            const decoded = contract.abi.decodeEvent(data.toU8a()) as any;
            callback({
              name: decoded.event.identifier,
              args: decoded.args.reduce(
                (acc: Record<string, unknown>, arg: any) => ({
                  ...acc,
                  [arg.label]: arg.value.toJSON(),
                }),
                {},
              ),
            });
          } catch (error) {
            console.warn("Failed to decode contract event", error);
          }
        }
      });
    });
  }

  async subscribeBlocks(callback: (blockNumber: number) => void) {
    const api = await this.ensureApi();
    return api.rpc.chain.subscribeNewHeads((header) => {
      callback(header.number.toNumber());
    });
  }

  async disconnect() {
    await disconnectApi();
  }
}

export const calculateProgress = (elapsedBlocks: number): number => {
  if (elapsedBlocks <= 0) return 0;
  return Math.min(elapsedBlocks / MATURITY_BLOCKS, 1);
};

export const calculateRewardPreview = (
  cores: number,
  elapsedBlocks: number,
  multiplier: number,
): bigint => {
  if (!cores || elapsedBlocks <= 0) return ZERO_BALANCE;
  return BigInt(cores) * BigInt(elapsedBlocks) * BASE_RATE * BigInt(multiplier);
};

export const boomDetails = {
  claims: ELASTIC_BOOM_CLAIMS,
  multiplier: ELASTIC_BOOM_MULTIPLIER,
};
