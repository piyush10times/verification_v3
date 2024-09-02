import { Controller, Get, Query } from '@nestjs/common';
import { WorkerService } from './worker.service';

@Controller('worker')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}
  @Get()
  async getProcessRun(@Query() query: { ids: string }) {
    this.workerService.getDataAndCompare(query);
    return 'request recieved';
  }
}
