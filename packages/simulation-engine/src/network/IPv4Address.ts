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

function addressToInt(address: string): number {
  return address.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function intToAddress(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join(".");
}

// prefixLength 0 is special-cased: JS's `<<` shifts its right operand mod
// 32, so `x << 32` is `x << 0`, not the all-zero mask /0 needs.
function maskForPrefix(prefixLength: number): number {
  return prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
}

export interface HostAddressRange {
  first: string;
  last: string;
}

// An immutable IPv4 address + prefix length. Validates only what this
// milestone needs (four 0-255 octets, a 0-32 prefix) — no reachability.
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

  subnetMask(): string {
    return intToAddress(maskForPrefix(this.prefixLength));
  }

  networkAddress(): string {
    const mask = maskForPrefix(this.prefixLength);
    return intToAddress(addressToInt(this.address) & mask);
  }

  broadcastAddress(): string {
    const mask = maskForPrefix(this.prefixLength);
    const network = addressToInt(this.address) & mask;
    return intToAddress(network | (~mask >>> 0));
  }

  // /31 (RFC 3021 point-to-point) and /32 (single host) have no separate
  // network/broadcast reserved from the usable range, so the whole range is
  // usable rather than excluding the first/last address.
  hostAddressRange(): HostAddressRange {
    if (this.prefixLength >= 31) {
      return { first: this.networkAddress(), last: this.broadcastAddress() };
    }

    const mask = maskForPrefix(this.prefixLength);
    const network = addressToInt(this.address) & mask;
    const broadcast = network | (~mask >>> 0);
    return { first: intToAddress(network + 1), last: intToAddress(broadcast - 1) };
  }

  // A configuration consistency check, not on-link determination: true only
  // when both sides share a prefix length and a derived network address —
  // a /24 and a /25 covering the same range still fail this. Real on-link
  // determination is interface-perspective and can be asymmetric when
  // prefix lengths differ (one side may consider the other on-link while
  // the reverse doesn't hold); that's a separate, later API.
  hasMatchingSubnetConfiguration(other: IPv4Address): boolean {
    return this.prefixLength === other.prefixLength && this.networkAddress() === other.networkAddress();
  }
}
