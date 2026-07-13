import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

function createAdapter(databaseUrl: string) {
  const url = new URL(databaseUrl);
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    connectionLimit: 10,
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: createAdapter(
        config.get<string>(
          'DATABASE_URL',
          'mysql://root:@localhost:3306/luistoledo',
        ),
      ),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
