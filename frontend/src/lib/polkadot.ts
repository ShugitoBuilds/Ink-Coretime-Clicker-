import { ApiPromise, WsProvider } from "@polkadot/api";
import { ContractPromise } from "@polkadot/api-contract";
import type { InjectedExtension } from "@polkadot/extension-inject/types";

import metadata from "../contracts/coretime_clicker.json";
import { CONTRACT_ADDRESS, RPC_ENDPOINT } from "../config";

let apiInstance: ApiPromise | null = null;
let contractInstance: ContractPromise | null = null;

export const getApi = async (): Promise<ApiPromise> => {
  if (apiInstance) {
    return apiInstance;
  }

  const provider = new WsProvider(RPC_ENDPOINT);
  apiInstance = await ApiPromise.create({ provider });
  return apiInstance;
};

export const getContract = async (): Promise<ContractPromise> => {
  if (contractInstance) {
    return contractInstance;
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error("Contract address (VITE_CONTRACT_ADDRESS) is not set.");
  }

  const api = await getApi();
  contractInstance = new ContractPromise(api, metadata as any, CONTRACT_ADDRESS);
  return contractInstance;
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
    contractInstance = null;
  }
};
