import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { Storage } from './storage.interface';

@Injectable()
export class LocalDiskStorage implements Storage {
  private readonly logger = new Logger(LocalDiskStorage.name);
  private readonly baseDir: string;

  constructor(config: ConfigService) {
    // Resolved once. UPLOAD_DIR must sit outside anything served statically,
    // and nothing in this app serves it (BR-10, NFR-11).
    this.baseDir = resolve(config.getOrThrow<string>('UPLOAD_DIR'));
  }

  async save(bytes: Buffer): Promise<string> {
    await mkdir(this.baseDir, { recursive: true });

    // 32 hex characters of randomness, and never the user's filename: a
    // stored receipt must not be guessable from another one's name.
    const key = randomBytes(16).toString('hex');
    await writeFile(this.pathFor(key), bytes, { mode: 0o600 });

    return key;
  }

  createReadStream(key: string): Readable {
    return createReadStream(this.pathFor(key));
  }

  async remove(key: string): Promise<void> {
    const path = this.pathFor(key);
    if (!existsSync(path)) {
      this.logger.warn(`Storage key ${key} had no file on disk`);
      return;
    }
    await rm(path, { force: true });
  }

  /** basename() strips any path separators, so a key from the database can
   *  never walk out of the upload directory. */
  private pathFor(key: string): string {
    return resolve(this.baseDir, basename(key));
  }
}
