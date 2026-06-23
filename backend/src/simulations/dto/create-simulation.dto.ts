import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class CreateSimulationDto {
  @ValidateIf((dto: CreateSimulationDto) => !dto.asm)
  @IsString()
  mem?: string;

  @ValidateIf((dto: CreateSimulationDto) => !dto.mem)
  @IsString()
  asm?: string;

  @IsOptional()
  @IsIn(['mem', 'asm'])
  sourceType?: 'mem' | 'asm';

  @IsOptional()
  @IsBoolean()
  debug?: boolean;

  @IsOptional()
  @IsBoolean()
  waveform?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  maxCycles?: number;
}
