import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';
import { CreateGatewayDto, UpdateGatewayDto } from './dto';
import { GatewayConfig } from '../../shared/entities';

@ApiTags('Gateway Configurations')
@Controller('api/gateway/configs')
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get()
  @ApiOperation({ summary: 'List all gateway configurations' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of gateway configurations' })
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.gatewayService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a gateway configuration by ID' })
  @ApiResponse({ status: 200, description: 'Gateway configuration details', type: GatewayConfig })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gatewayService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new gateway configuration' })
  @ApiResponse({ status: 201, description: 'Gateway configuration created', type: GatewayConfig })
  @ApiResponse({ status: 409, description: 'Configuration with same content already exists' })
  async create(@Body() createGatewayDto: CreateGatewayDto) {
    return this.gatewayService.create(createGatewayDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a gateway configuration' })
  @ApiResponse({ status: 200, description: 'Gateway configuration updated', type: GatewayConfig })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGatewayDto: UpdateGatewayDto,
  ) {
    return this.gatewayService.update(id, updateGatewayDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a gateway configuration (soft delete)' })
  @ApiResponse({ status: 204, description: 'Gateway configuration deleted' })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.gatewayService.remove(id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a gateway configuration' })
  @ApiResponse({ status: 200, description: 'Gateway configuration activated', type: GatewayConfig })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.gatewayService.activate(id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a gateway configuration' })
  @ApiResponse({ status: 200, description: 'Gateway configuration deactivated', type: GatewayConfig })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.gatewayService.deactivate(id);
  }
}