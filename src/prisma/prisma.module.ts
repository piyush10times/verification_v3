import { Global, Module } from '@nestjs/common';
import { PrismaMysqlService } from './prisma.mysqldbservice';
import { ElasticsearchService } from './connection.es';
import { PrismaMicroService } from './prisma.microservice';
@Global()
@Module({
  controllers: [],
  providers: [PrismaMysqlService, PrismaMicroService, ElasticsearchService],
})
export class PrismaModule {}
