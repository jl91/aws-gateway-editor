import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderEndpointsDto {
  @ApiProperty({
    description: 'Array of endpoint IDs in the desired order',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  endpointIds: string[];
}