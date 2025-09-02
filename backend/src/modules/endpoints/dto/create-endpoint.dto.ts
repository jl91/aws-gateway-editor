import {
  IsString,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export enum IntegrationType {
  LAMBDA = 'Lambda',
  HTTP = 'HTTP',
  MOCK = 'Mock',
  STEP_FUNCTION = 'StepFunction',
}

export class CreateEndpointDto {
  @ApiProperty({ enum: HttpMethod, description: 'HTTP method' })
  @IsEnum(HttpMethod)
  method: HttpMethod;

  @ApiProperty({ description: 'API path' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  path: string;

  @ApiPropertyOptional({ description: 'Unique operation identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  operationId?: string;

  @ApiPropertyOptional({ description: 'Brief summary of the endpoint' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the endpoint' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tags for grouping endpoints' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Target URL for proxy' })
  @IsOptional()
  @IsString()
  targetUrl?: string;

  @ApiPropertyOptional({ description: 'Header parameters' })
  @IsOptional()
  @IsObject()
  headers?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Query parameters' })
  @IsOptional()
  @IsObject()
  queryParams?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Path parameters' })
  @IsOptional()
  @IsObject()
  pathParams?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Request body schema' })
  @IsOptional()
  @IsObject()
  requestBody?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Response definitions' })
  @IsOptional()
  @IsObject()
  responses?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Security requirements' })
  @IsOptional()
  @IsObject()
  security?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Authentication configuration' })
  @IsOptional()
  @IsObject()
  authentication?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Rate limiting configuration' })
  @IsOptional()
  @IsObject()
  rateLimiting?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Cache configuration' })
  @IsOptional()
  @IsObject()
  cacheConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'CORS configuration' })
  @IsOptional()
  @IsObject()
  corsConfig?: Record<string, any>;

  @ApiPropertyOptional({ enum: IntegrationType, description: 'Integration type' })
  @IsOptional()
  @IsEnum(IntegrationType)
  integrationType?: IntegrationType;

  @ApiPropertyOptional({ description: 'Integration configuration' })
  @IsOptional()
  @IsObject()
  integrationConfig?: Record<string, any>;

  @ApiPropertyOptional({ description: 'OpenAPI extensions (x-*)' })
  @IsOptional()
  @IsObject()
  xExtensions?: Record<string, any>;
}