import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EndpointsService } from './endpoints.service';
import { CreateEndpointDto, UpdateEndpointDto, ReorderEndpointsDto } from './dto';
import { GatewayEndpoint } from '../../shared/entities';

@ApiTags('Endpoints')
@Controller('api/gateway/:configId/endpoints')
export class EndpointsController {
  constructor(private readonly endpointsService: EndpointsService) {}

  @Get()
  @ApiOperation({ summary: 'List all endpoints for a gateway configuration' })
  @ApiResponse({ status: 200, description: 'List of endpoints', type: [GatewayEndpoint] })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async findAll(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.endpointsService.findAll(configId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an endpoint by ID' })
  @ApiResponse({ status: 200, description: 'Endpoint details', type: GatewayEndpoint })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async findOne(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.endpointsService.findOne(configId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new endpoint' })
  @ApiResponse({ status: 201, description: 'Endpoint created', type: GatewayEndpoint })
  @ApiResponse({ status: 400, description: 'Duplicate endpoint or invalid data' })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async create(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() createEndpointDto: CreateEndpointDto,
  ) {
    return this.endpointsService.create(configId, createEndpointDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint updated', type: GatewayEndpoint })
  @ApiResponse({ status: 400, description: 'Duplicate endpoint or invalid data' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async update(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEndpointDto: UpdateEndpointDto,
  ) {
    return this.endpointsService.update(configId, id, updateEndpointDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an endpoint (soft delete)' })
  @ApiResponse({ status: 204, description: 'Endpoint deleted' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async remove(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.endpointsService.remove(configId, id);
  }

  @Put('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reorder endpoints' })
  @ApiResponse({ status: 204, description: 'Endpoints reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid endpoint IDs' })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async reorder(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() reorderDto: ReorderEndpointsDto,
  ) {
    await this.endpointsService.reorder(configId, reorderDto);
  }
}