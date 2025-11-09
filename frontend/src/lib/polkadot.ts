import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import type { InjectedExtension } from "@polkadot/extension-inject/types";

import prizePoolMetadata from "../contracts/prize_pool.json";
import rngMetadata from "../contracts/rng.json";
import { PRIZE_POOL_ADDRESS, RNG_ADDRESS, RPC_ENDPOINT } from "../config";

let apiInstance: ApiPromise | null = null;
let prizePoolInstance: ContractPromise | null = null;
let rngInstance: ContractPromise | null = null;

export const getApi = async (): Promise<ApiPromise> => {
  if (apiInstance) {
    return apiInstance;
  }

  const provider = new WsProvider(RPC_ENDPOINT);
  apiInstance = await ApiPromise.create({ provider });
  return apiInstance;
};

export const getPrizePoolContract = async (): Promise<ContractPromise> => {
  if (prizePoolInstance) {
    return prizePoolInstance;
  }

  if (!PRIZE_POOL_ADDRESS) {
    throw new Error("PrizePool contract address (VITE_PRIZE_POOL_ADDRESS) is not set.");
  }

  const api = await getApi();
  prizePoolInstance = new ContractPromise(api, prizePoolMetadata as any, PRIZE_POOL_ADDRESS);
  return prizePoolInstance;
};

export const getRNGContract = async (): Promise<ContractPromise> => {
  if (rngInstance) {
    return rngInstance;
  }

  if (!RNG_ADDRESS) {
    throw new Error("RNG contract address (VITE_RNG_ADDRESS) is not set.");
  }

  const api = await getApi();
  rngInstance = new ContractPromise(api, rngMetadata as any, RNG_ADDRESS);
  return rngInstance;
};

export const withSigner = async (
  extension: InjectedExtension,
  _address: string,
): Promise<{
  signer: InjectedExtension["signer"];
}> => {
  if (!extension?.signer) {
    throw new Error("Wallet extension signer unavailable.");
  }

  return {
    signer: extension.signer,
  };
};

export const disconnectApi = async () => {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
    prizePoolInstance = null;
    rngInstance = null;
  }
};
