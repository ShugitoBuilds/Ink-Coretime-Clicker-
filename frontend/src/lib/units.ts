import { TOKEN_DECIMALS, TOKEN_SYMBOL } from "../config";

const TEN = BigInt(10);
const DECIMALS = BigInt(TOKEN_DECIMALS);
const UNIT = TEN ** DECIMALS;

export const tokenSymbol = TOKEN_SYMBOL;

export const formatTokens = (value: bigint): string => {
  const negative = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const whole = absolute / UNIT;
  const fraction = absolute % UNIT;
  if (fraction === 0n) {
    return `${negative}${whole.toString()} ${TOKEN_SYMBOL}`;
  }
  const fractionStr = fraction.toString().padStart(Number(DECIMALS), "0").replace(/0+$/, "");
  return `${negative}${whole.toString()}.${fractionStr} ${TOKEN_SYMBOL}`;
};

export const parseTokens = (input: string): bigint | null => {
  const cleaned = input.trim();
  if (!cleaned) return null;
  const negative = cleaned.startsWith("-");
  const normalized = negative ? cleaned.slice(1) : cleaned;
  const parts = normalized.split(".");
  if (parts.length > 2) return null;
  const wholePart = parts[0] ?? "0";
  const fractionPart = (parts[1] ?? "").slice(0, Number(DECIMALS));
  if (!/^\d+$/.test(wholePart) || (fractionPart && !/^\d+$/.test(fractionPart))) {
    return null;
  }
  const whole = BigInt(wholePart) * UNIT;
  const fraction = fractionPart
    ? BigInt(fractionPart.padEnd(Number(DECIMALS), "0"))
    : 0n;
  const result = whole + fraction;
  return negative ? -result : result;
};

export const oneUnit = UNIT;
