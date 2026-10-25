import { isIPv4, isIPv6 } from "node:net";

const v4 = (ip: string) => ip.split(".").map(Number);

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = v4(ip);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) || // link-local + cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 // multicast, reserved, broadcast
  );
}

/** Expand an IPv6 address to 8 16-bit groups. */
function expandV6(ip: string): number[] {
  let s = ip.split("%")[0].toLowerCase();
  const m = s.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/); // embedded dotted v4
  if (m) {
    const [a, b, c, d] = v4(m[2]);
    s = `${m[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  const fill = tail !== undefined ? 8 - h.length - t.length : 0;
  return [...h, ...Array(fill).fill("0"), ...t].map((g) => parseInt(g || "0", 16));
}

function isPrivateV6(ip: string): boolean {
  const g = expandV6(ip);
  const embedded = (hi: number, lo: number) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  if (g.every((x) => x === 0)) return true; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return isPrivateV4(embedded(g[6], g[7])); // ::ffff:v4
  if (g.slice(0, 6).every((x) => x === 0)) return true; // deprecated v4-compatible
  if (g[0] === 0x64 && g[1] === 0xff9b) return isPrivateV4(embedded(g[6], g[7])); // NAT64
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if (g[0] === 0x2002) return true; // 6to4 (embeds arbitrary v4)
  return false;
}

/** true only for globally routable unicast addresses. */
export function isPublicIp(ip: string): boolean {
  if (isIPv4(ip)) return !isPrivateV4(ip);
  if (isIPv6(ip)) return !isPrivateV6(ip);
  return false;
}
