import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EndpointsService } from './endpoints.service';
import { GatewayEndpoint, GatewayConfig } from '../../shared/entities';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { HttpMethod } from './dto/create-endpoint.dto';

describe('EndpointsService', () => {
  let service: EndpointsService;
  let endpointRepo: Repository<GatewayEndpoint>;
  let configRepo: Repository<GatewayConfig>;

  const mockEndpointRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    })),
  };

  const mockConfigRepo = {
    findOne: jest.fn(),
  };

  const mockConfig: GatewayConfig = {
    id: 'config-id',
    name: 'Test Config',
    version: '1.0.0',
    description: 'Test',
    fileHash: 'hash',
    openapiVersion: '3.0.0',
    isActive: true,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    endpoints: [],
  };

  const mockEndpoint: GatewayEndpoint = {
    id: 'endpoint-id',
    config: mockConfig,
    sequenceOrder: 10,
    method: 'GET',
    path: '/test',
    operationId: 'getTest',
    summary: 'Test endpoint',
    description: 'Test description',
    tags: ['test'],
    targetUrl: null,
    headers: null,
    queryParams: null,
    pathParams: null,
    requestBody: null,
    responses: { '200': { description: 'OK' } },
    security: null,
    authentication: null,
    rateLimiting: null,
    cacheConfig: null,
    corsConfig: null,
    integrationType: null,
    integrationConfig: null,
    xExtensions: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EndpointsService,
        {
          provide: getRepositoryToken(GatewayEndpoint),
          useValue: mockEndpointRepo,
        },
        {
          provide: getRepositoryToken(GatewayConfig),
          useValue: mockConfigRepo,
        },
      ],
    }).compile();

    service = module.get<EndpointsService>(EndpointsService);
    endpointRepo = module.get<Repository<GatewayEndpoint>>(
      getRepositoryToken(GatewayEndpoint),
    );
    configRepo = module.get<Repository<GatewayConfig>>(
      getRepositoryToken(GatewayConfig),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all endpoints for a configuration', async () => {
      const endpoints = [mockEndpoint];
      mockConfigRepo.findOne.mockResolvedValue(mockConfig);
      mockEndpointRepo.find.mockResolvedValue(endpoints);

      const result = await service.findAll('config-id');

      expect(result).toEqual(endpoints);
      expect(mockEndpointRepo.find).toHaveBeenCalledWith({
        where: { config: { id: 'config-id' }, deletedAt: null },
        order: { sequenceOrder: 'ASC' },
      });
    });

    it('should throw NotFoundException when configuration not found', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);

      await expect(service.findAll('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne', () => {
    it('should return an endpoint by id', async () => {
      mockEndpointRepo.findOne.mockResolvedValue(mockEndpoint);

      const result = await service.findOne('config-id', 'endpoint-id');

      expect(result).toEqual(mockEndpoint);
      expect(mockEndpointRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: 'endpoint-id',
          config: { id: 'config-id' },
          deletedAt: null,
        },
        relations: ['config'],
      });
    });

    it('should throw NotFoundException when endpoint not found', async () => {
      mockEndpointRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('config-id', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto = {
      method: HttpMethod.POST,
      path: '/users',
      operationId: 'createUser',
      summary: 'Create a new user',
      tags: ['users'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'object' },
          },
        },
      },
      responses: {
        '201': { description: 'Created' },
        '400': { description: 'Bad Request' },
      },
    };

    it('should create a new endpoint', async () => {
      mockConfigRepo.findOne.mockResolvedValue(mockConfig);
      mockEndpointRepo.findOne.mockResolvedValue(null);
      mockEndpointRepo.createQueryBuilder().getRawOne.mockResolvedValue({ max: 10 });
      mockEndpointRepo.create.mockReturnValue(mockEndpoint);
      mockEndpointRepo.save.mockResolvedValue(mockEndpoint);

      const result = await service.create('config-id', createDto);

      expect(result).toEqual(mockEndpoint);
      expect(mockEndpointRepo.create).toHaveBeenCalledWith({
        ...createDto,
        config: mockConfig,
        sequenceOrder: 20,
      });
    });

    it('should throw BadRequestException when endpoint already exists', async () => {
      mockConfigRepo.findOne.mockResolvedValue(mockConfig);
      mockEndpointRepo.findOne.mockResolvedValue(mockEndpoint);

      await expect(service.create('config-id', createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate correct sequence order for first endpoint', async () => {
      mockConfigRepo.findOne.mockResolvedValue(mockConfig);
      mockEndpointRepo.findOne.mockResolvedValue(null);
      mockEndpointRepo.createQueryBuilder().getRawOne.mockResolvedValue({ max: null });
      mockEndpointRepo.create.mockReturnValue(mockEndpoint);
      mockEndpointRepo.save.mockResolvedValue(mockEndpoint);

      await service.create('config-id', createDto);

      expect(mockEndpointRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sequenceOrder: 10,
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      summary: 'Updated summary',
      description: 'Updated description',
    };

    it('should update an endpoint', async () => {
      mockEndpointRepo.findOne
        .mockResolvedValueOnce(mockEndpoint) // For findOne
        .mockResolvedValueOnce(null); // For duplicate check
      mockEndpointRepo.save.mockResolvedValue({
        ...mockEndpoint,
        ...updateDto,
      });

      const result = await service.update('config-id', 'endpoint-id', updateDto);

      expect(result.summary).toBe(updateDto.summary);
      expect(result.description).toBe(updateDto.description);
    });

    it('should check for duplicates when method or path changes', async () => {
      const updateDto = {
        method: HttpMethod.PUT,
        path: '/users',
      };
      const existingEndpoint = { ...mockEndpoint, id: 'other-id' };

      mockEndpointRepo.findOne
        .mockResolvedValueOnce(mockEndpoint)
        .mockResolvedValueOnce(existingEndpoint);

      await expect(
        service.update('config-id', 'endpoint-id', updateDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should soft delete an endpoint', async () => {
      mockEndpointRepo.findOne.mockResolvedValue(mockEndpoint);
      mockEndpointRepo.save.mockResolvedValue({
        ...mockEndpoint,
        deletedAt: new Date(),
      });

      await service.remove('config-id', 'endpoint-id');

      expect(mockEndpointRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('reorder', () => {
    it('should reorder endpoints', async () => {
      const endpoints = [
        { ...mockEndpoint, id: 'ep1' },
        { ...mockEndpoint, id: 'ep2' },
        { ...mockEndpoint, id: 'ep3' },
      ];
      const reorderDto = {
        endpointIds: ['ep2', 'ep1', 'ep3'],
      };

      mockConfigRepo.findOne.mockResolvedValue(mockConfig);
      mockEndpointRepo.find.mockResolvedValue(endpoints);

      await service.reorder('config-id', reorderDto);

      expect(mockEndpointRepo.update).toHaveBeenCalledTimes(3);
      expect(mockEndpointRepo.update).toHaveBeenNthCalledWith(
        1,
        { id: 'ep2' },
        { sequenceOrder: 10 },
      );
      expect(mockEndpointRepo.update).toHaveBeenNthCalledWith(
        2,
        { id: 'ep1' },
        { sequenceOrder: 20 },
      );
      expect(mockEndpointRepo.update).toHaveBeenNthCalledWith(
        3,
        { id: 'ep3' },
        { sequenceOrder: 30 },
      );
    });

    it('should throw BadRequestException for invalid endpoint IDs', async () => {
      const endpoints = [{ ...mockEndpoint, id: 'ep1' }];
      const reorderDto = {
        endpointIds: ['ep1', 'invalid-id'],
      };

      mockConfigRepo.findOne.mockResolvedValue(mockConfig);
      mockEndpointRepo.find.mockResolvedValue(endpoints);

      await expect(
        service.reorder('config-id', reorderDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});