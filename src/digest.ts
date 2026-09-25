import { createHash } from "node:crypto";

/** SHA-256 of raw file bytes, lowercase hex. */
export function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Fingerprint of an input set.
 * Paths are sorted by UTF-8 byte order. The hashed bytes are UTF-8 JSON with
 * no whitespace and key order path, sha256.
 */
export function inputSetFingerprint(entries: { path: string; sha256: string }[]): string {
  const sorted = [...entries].sort((left, right) =>
    Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8")),
  );
  const json = JSON.stringify(sorted.map((entry) => ({ path: entry.path, sha256: entry.sha256 })));
  return sha256Hex(Buffer.from(json, "utf8"));
}
