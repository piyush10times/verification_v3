import { Controller, Get } from '@nestjs/common';
import { WorkerService } from './worker.service';

@Controller('worker')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}
  @Get()
  async getProcessRun() {
    this.workerService.getDataAndCompare();
    return 'request recieved';
  }
}
