import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

type EncryptedPayload = { version: 1; iv: string; tag: string; data: string };

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const masterKey = config.getOrThrow<string>('APP_ENCRYPTION_KEY');
    this.key = createHash('sha256').update(masterKey).digest();
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const payload: EncryptedPayload = {
      version: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      data: data.toString('base64'),
    };
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  decrypt(serialized: string): string {
    const payload = JSON.parse(
      Buffer.from(serialized, 'base64url').toString('utf8'),
    ) as EncryptedPayload;
    if (payload.version !== 1)
      throw new Error('Unsupported encrypted payload version');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(payload.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(payload.data, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
