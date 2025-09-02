import { IsString, IsOptional, IsBoolean, IsObject, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGatewayDto {
  @ApiProperty({ description: 'Name of the gateway configuration' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Version of the gateway configuration' })
  @IsString()
  @MaxLength(50)
  version: string;

  @ApiPropertyOptional({ description: 'Description of the gateway configuration' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'OpenAPI version', default: '3.0.0' })
  @IsOptional()
  @IsString()
  @IsEnum(['3.0.0', '3.0.1', '3.0.2', '3.0.3', '3.1.0'])
  openapiVersion?: string = '3.0.0';

  @ApiPropertyOptional({ description: 'Whether this configuration is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = false;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}