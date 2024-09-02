import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/mysql/client';
@Injectable()
export class PrismaMysqlService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
        {
          emit: 'event',
          level: 'error',
        },
      ],
    });
  }
  async onModuleInit() {
    await this.$connect();
    console.log('10times db up');

    // this.$on(
    //   'query' as never,
    //   (event: { query: string; params: string; duration: number }) => {
    //     console.log('\n\nQuery:', event.query);
    //     console.log('Params:', event.params);
    //     console.log('Duration:' + event.duration + ' ms' + '\n\n');
    //     // logger.info(`Query: ${event.query}`);
    //     // logger.info(`Params: ${event.params}`);
    //     // logger.info(`Duration: ${event.duration}ms/n`);
    //   },
    // );
  }

  async onModuleDestroy() {
    // logger.info('/n/n');
    await this.$disconnect();
  }
}
