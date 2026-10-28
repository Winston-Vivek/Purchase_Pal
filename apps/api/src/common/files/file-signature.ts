/**
 * BR-10: allowed types are checked by MIME **and** file signature.
 *
 * MIME alone is worthless here — it is whatever the client said. A text file
 * renamed receipt.pdf arrives with Content-Type application/pdf and a .pdf
 * extension; only the first bytes disagree (API-ATT-06).
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

const SIGNATURES: { mime: AllowedMimeType; matches: (bytes: Buffer) => boolean }[] = [
  { mime: 'application/pdf', matches: (b) => b.subarray(0, 4).toString('hex') === '25504446' },
  { mime: 'image/jpeg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    matches: (b) => b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
  },
  {
    mime: 'image/webp',
    matches: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

/** The type the bytes actually are, or null if they are none of the four. */
export function detectMimeType(bytes: Buffer): AllowedMimeType | null {
  if (bytes.length < 12) return null;
  return SIGNATURES.find((signature) => signature.matches(bytes))?.mime ?? null;
}

/** Both the declared type and the real one must be allowed, and must agree. */
export function isAcceptableUpload(declaredMimeType: string, bytes: Buffer): boolean {
  if (!ALLOWED_MIME_TYPES.includes(declaredMimeType as AllowedMimeType)) return false;
  return detectMimeType(bytes) === declaredMimeType;
}
