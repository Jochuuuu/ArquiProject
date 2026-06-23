import { Module } from '@nestjs/common';
import { AssemblerService } from './assembler.service';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';

@Module({
  controllers: [SimulationsController],
  providers: [AssemblerService, SimulationsService],
})
export class SimulationsModule {}
