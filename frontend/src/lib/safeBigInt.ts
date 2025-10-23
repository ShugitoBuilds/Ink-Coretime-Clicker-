const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const unwrapCodec = (value: unknown): unknown => {
  if (!isObject(value)) {
    return value;
  }

  if ("isOk" in value && typeof value.isOk === "boolean") {
    if (value.isOk && "asOk" in value) {
      return unwrapCodec(value.asOk);
    }

    if (!value.isOk && "asErr" in value) {
      throw new Error(String(value.asErr));
    }
  }

  if ("ok" in value) {
    return unwrapCodec(value.ok);
  }

  if ("Ok" in value) {
    return unwrapCodec(value.Ok);
  }

  if ("value" in value) {
    return unwrapCodec(value.value);
  }

  if ("toJSON" in value && typeof value.toJSON === "function") {
    try {
      return unwrapCodec(value.toJSON());
    } catch (error) {
      console.warn("Failed to unwrap codec via toJSON", error, value);
    }
  }

  return value;
};

const stringToBigInt = (raw: string): bigint => {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return 0n;
  }

  if (/^[-+]?\d+$/.test(trimmed)) {
    return BigInt(trimmed);
  }

  if (/^[-+]?0x[0-9a-f]+$/i.test(trimmed)) {
    return BigInt(trimmed);
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed !== trimmed) {
      return safeToBigInt(parsed);
    }
  } catch {
    // ignore JSON parse failures, we'll fall back to pattern matching below
  }

  const match = trimmed.match(/-?\d+/);
  if (match) {
    return BigInt(match[0]);
  }

  throw new Error(`Cannot convert ${trimmed} to BigInt`);
};

export const safeToBigInt = (value: unknown): bigint => {
  if (value === null || value === undefined) {
    return 0n;
  }

  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    return BigInt(value);
  }

  if (typeof value === "string") {
    return stringToBigInt(value);
  }

  if (isObject(value)) {
    const unwrapped = unwrapCodec(value);
    if (unwrapped !== value) {
      return safeToBigInt(unwrapped);
    }

    if ("toString" in value && typeof value.toString === "function") {
      const text = value.toString();
      if (text && text !== "[object Object]") {
        return stringToBigInt(text);
      }
    }
  }

  throw new Error("Cannot convert value to BigInt");
};

export const maybeBigInt = (value: unknown): bigint | null => {
  try {
    return safeToBigInt(value);
  } catch (error) {
    console.warn("Failed to coerce value to BigInt", error, value);
    return null;
  }
};
