import { INestApplication } from '@nestjs/common';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { signUp } from './utils/auth';
import { createTestApp } from './utils/create-test-app';
import { truncateAll } from './utils/database';

/**
 * API-ATT-01..14 from docs/test-cases.md §2.5 — US-03, BR-06, BR-10.
 *
 * A receipt is the one thing in Proofly a user cannot re-create if it is lost,
 * and it is the only user-supplied file the server stores. So these tests care
 * as much about what is NOT written to disk as about what is.
 */

const FIXTURES = resolve(__dirname, 'fixtures');
const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './var/uploads-test');

const fixture = (name: string) => join(FIXTURES, name);

function storedFiles(): string[] {
  return existsSync(UPLOAD_DIR) ? readdirSync(UPLOAD_DIR) : [];
}

describe('Receipts (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let cookie: string;
  let purchaseId: string;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
  });

  beforeEach(async () => {
    await truncateAll(dataSource);
    rmSync(UPLOAD_DIR, { recursive: true, force: true });
    ({ cookie } = await signUp(app));

    const created = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Cookie', cookie)
      .send({
        productName: 'AirPods Pro (2nd generation)',
        category: 'ELECTRONICS',
        purchaseDate: '2026-10-27',
        price: 24900,
      })
      .expect(201);
    purchaseId = created.body.id;
  });

  afterAll(async () => {
    rmSync(UPLOAD_DIR, { recursive: true, force: true });
    await app.close();
  });

  const upload = (file: string, as: string = cookie, target: string = purchaseId) =>
    request(app.getHttpServer())
      .post(`/api/v1/purchases/${target}/attachments`)
      .set('Cookie', as)
      .attach('file', fixture(file));

  it('API-ATT-01 a PDF receipt is accepted and described back', async () => {
    const response = await upload('receipt.pdf').expect(201);

    expect(response.body).toMatchObject({
      fileName: 'receipt.pdf',
      mimeType: 'application/pdf',
      fileSize: readFileSync(fixture('receipt.pdf')).length,
    });
    expect(typeof response.body.id).toBe('string');
    // The storage key is internal; leaking it invites someone to go looking.
    expect(response.body).not.toHaveProperty('storageKey');
  });

  it('API-ATT-02 JPEG, PNG and WEBP are accepted too', async () => {
    for (const file of ['receipt.jpg', 'receipt.png', 'receipt.webp']) {
      await upload(file).expect(201);
    }
    expect(storedFiles()).toHaveLength(3);
  });

  it('API-ATT-03 downloading returns the identical bytes and the original name', async () => {
    const uploaded = await upload('receipt.pdf').expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/attachments/${uploaded.body.id}`)
      .set('Cookie', cookie)
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      })
      .expect(200);

    expect(Buffer.compare(response.body as Buffer, readFileSync(fixture('receipt.pdf')))).toBe(0);
    expect(response.headers['content-disposition']).toContain('receipt.pdf');
  });

  it('API-ATT-04 a file over 5 MB is 413 and nothing is written', async () => {
    const response = await upload('big.pdf').expect(413);

    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(storedFiles()).toHaveLength(0);
  });

  it('API-ATT-05 an executable is 415 and nothing is written', async () => {
    const response = await upload('malware.exe').expect(415);

    expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(storedFiles()).toHaveLength(0);
  });

  it('API-ATT-06 a text file renamed .pdf is caught by its signature', async () => {
    // The extension and the Content-Type both claim PDF. Only the first bytes
    // tell the truth, which is why MIME alone is not a check.
    const response = await upload('fake.pdf').expect(415);

    expect(response.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(storedFiles()).toHaveLength(0);
  });

  it('API-ATT-07 a sixth file on one purchase is refused', async () => {
    for (let i = 0; i < 5; i += 1) await upload('receipt.pdf').expect(201);

    const response = await upload('receipt.pdf').expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(storedFiles()).toHaveLength(5);
  });

  it('API-ATT-08 a request with no file is refused', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/purchases/${purchaseId}/attachments`)
      .set('Cookie', cookie)
      .expect(400);
  });

  it('API-ATT-09 the stored file has a random name, under UPLOAD_DIR, off any public route', async () => {
    await upload('receipt.pdf').expect(201);

    const files = storedFiles();
    expect(files).toHaveLength(1);

    const key = files[0] as string;
    expect(key).not.toBe('receipt.pdf');
    expect(key).not.toContain('receipt');
    // Random enough that a stored file cannot be guessed from another's name.
    expect(key).toMatch(/^[0-9a-f]{32,}$/);

    // And nothing serves UPLOAD_DIR over HTTP (NFR-11).
    await request(app.getHttpServer()).get(`/uploads/${key}`).expect(404);
    await request(app.getHttpServer()).get(`/api/v1/uploads/${key}`).expect(404);
  });

  it('API-ATT-13 deleting a receipt removes the row and the file', async () => {
    const uploaded = await upload('receipt.pdf').expect(201);
    expect(storedFiles()).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/attachments/${uploaded.body.id}`)
      .set('Cookie', cookie)
      .expect(204);

    expect(storedFiles()).toHaveLength(0);
    await request(app.getHttpServer())
      .get(`/api/v1/attachments/${uploaded.body.id}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('API-ATT-14 downloading without a cookie is 401', async () => {
    const uploaded = await upload('receipt.pdf').expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/attachments/${uploaded.body.id}`)
      .expect(401);
  });

  describe('BR-09 ownership', () => {
    let bCookie: string;
    let aAttachmentId: string;

    beforeEach(async () => {
      const uploaded = await upload('receipt.pdf').expect(201);
      aAttachmentId = uploaded.body.id;
      ({ cookie: bCookie } = await signUp(app, { email: 'bob@test.dev', name: 'Bob' }));
    });

    it("API-ATT-10 B cannot download A's receipt", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/attachments/${aAttachmentId}`)
        .set('Cookie', bCookie)
        .expect(404);
    });

    it("API-ATT-11 B cannot upload to A's purchase, and nothing is written", async () => {
      await upload('receipt.jpg', bCookie).expect(404);

      // Still only A's one receipt on disk.
      expect(storedFiles()).toHaveLength(1);
    });

    it("API-ATT-12 B cannot delete A's receipt, and the file survives", async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/attachments/${aAttachmentId}`)
        .set('Cookie', bCookie)
        .expect(404);

      expect(storedFiles()).toHaveLength(1);
    });
  });
});
