import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { WorkerController } from './worker.controller';
import { MysqLdata } from './worker.mysqldata';
import { MicroDataRetriver } from './worker.postgresdata';
import { EsDataRetriver } from './worker.esdata';

@Module({
  controllers: [WorkerController],
  providers: [WorkerService, MysqLdata, MicroDataRetriver, EsDataRetriver],
})
export class WorkerModule {}
