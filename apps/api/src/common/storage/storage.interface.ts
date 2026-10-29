import { Readable } from 'node:stream';

/** Swappable so local disk can become S3 later without touching a service
 *  (di-use-interfaces-tokens). */
export const STORAGE = Symbol('STORAGE');

export interface Storage {
  /** Writes the bytes under a newly generated random key, which it returns. */
  save(bytes: Buffer): Promise<string>;
  createReadStream(key: string): Readable;
  remove(key: string): Promise<void>;
}
