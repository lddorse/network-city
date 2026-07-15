const OCTET_PATTERN = /^\d{1,3}$/;

function isValidOctet(part: string): boolean {
  if (!OCTET_PATTERN.test(part)) {
    return false;
  }

  const value = Number(part);
  return value >= 0 && value <= 255;
}

function isValidAddress(address: string): boolean {
  const parts = address.split(".");
  return parts.length === 4 && parts.every(isValidOctet);
}

// An immutable IPv4 address + prefix length. Validates only what this
// milestone needs (four 0-255 octets, a 0-32 prefix) — no subnet
// arithmetic, no reachability.
export class IPv4Address {
  readonly address: string;
  readonly prefixLength: number;

  constructor(address: string, prefixLength: number) {
    if (!isValidAddress(address)) {
      throw new Error(`Invalid IPv4 address: "${address}"`);
    }

    if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
      throw new Error(`Invalid IPv4 prefix length: ${prefixLength}`);
    }

    this.address = address;
    this.prefixLength = prefixLength;
  }

  toCidr(): string {
    return `${this.address}/${this.prefixLength}`;
  }
}
