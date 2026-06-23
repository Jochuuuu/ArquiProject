import { IsString } from 'class-validator';

export class AssembleDto {
  @IsString()
  asm!: string;
}
