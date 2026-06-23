import { Body, Controller, Get, Header, NotFoundException, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AssemblerService } from './assembler.service';
import { AssembleDto } from './dto/assemble.dto';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SimulationsService } from './simulations.service';

@Controller('simulations')
export class SimulationsController {
  constructor(
    private readonly simulationsService: SimulationsService,
    private readonly assemblerService: AssemblerService,
  ) {}

  @Post('assemble')
  assemble(@Body() dto: AssembleDto): unknown {
    return this.assemblerService.assemble(dto.asm);
  }

  @Post()
  async create(@Body() dto: CreateSimulationDto): Promise<unknown> {
    return this.simulationsService.create(dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string): unknown {
    return this.simulationsService.getSummary(id);
  }

  @Get(':id/trace')
  getTrace(@Param('id') id: string): unknown {
    return this.simulationsService.getTrace(id);
  }

  @Get(':id/waveform')
  @Header('Content-Type', 'application/octet-stream')
  async getWaveform(@Param('id') id: string, @Res() res: Response) {
    const waveform = await this.simulationsService.getWaveformPath(id);
    if (!waveform) {
      throw new NotFoundException('Waveform not found for this simulation');
    }

    return res.download(waveform, `riscv-${id}.vcd`);
  }
}
