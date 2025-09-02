import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GatewayService } from './gateway.service';
import { GatewayConfig } from '../../shared/entities';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('GatewayService', () => {
  let service: GatewayService;
  let repository: Repository<GatewayConfig>;

  const mockRepository = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockGatewayConfig: GatewayConfig = {
    id: 'test-id',
    name: 'Test Gateway',
    version: '1.0.0',
    description: 'Test description',
    fileHash: 'test-hash',
    openapiVersion: '3.0.0',
    isActive: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    endpoints: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GatewayService,
        {
          provide: getRepositoryToken(GatewayConfig),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<GatewayService>(GatewayService);
    repository = module.get<Repository<GatewayConfig>>(
      getRepositoryToken(GatewayConfig),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated gateway configurations', async () => {
      const configs = [mockGatewayConfig];
      const total = 1;
      mockRepository.findAndCount.mockResolvedValue([configs, total]);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: configs,
        total,
        page: 1,
        limit: 10,
        pages: 1,
      });
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { deletedAt: null },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return a gateway configuration by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockGatewayConfig);

      const result = await service.findOne('test-id');

      expect(result).toEqual(mockGatewayConfig);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-id', deletedAt: null },
        relations: ['endpoints'],
      });
    });

    it('should throw NotFoundException when configuration not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should sort endpoints by sequence order', async () => {
      const configWithEndpoints = {
        ...mockGatewayConfig,
        endpoints: [
          { sequenceOrder: 20 },
          { sequenceOrder: 10 },
          { sequenceOrder: 30 },
        ],
      };
      mockRepository.findOne.mockResolvedValue(configWithEndpoints);

      const result = await service.findOne('test-id');

      expect(result.endpoints[0].sequenceOrder).toBe(10);
      expect(result.endpoints[1].sequenceOrder).toBe(20);
      expect(result.endpoints[2].sequenceOrder).toBe(30);
    });
  });

  describe('create', () => {
    const createDto = {
      name: 'New Gateway',
      version: '1.0.0',
      description: 'New gateway description',
    };

    it('should create a new gateway configuration', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockGatewayConfig);
      mockRepository.save.mockResolvedValue(mockGatewayConfig);

      const result = await service.create(createDto);

      expect(result).toEqual(mockGatewayConfig);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          fileHash: expect.any(String),
        }),
      );
    });

    it('should throw ConflictException when configuration with same hash exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockGatewayConfig);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      name: 'Updated Gateway',
      version: '2.0.0',
    };

    it('should update a gateway configuration', async () => {
      mockRepository.findOne.mockResolvedValue(mockGatewayConfig);
      mockRepository.save.mockResolvedValue({
        ...mockGatewayConfig,
        ...updateDto,
      });

      const result = await service.update('test-id', updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.version).toBe(updateDto.version);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should recalculate hash when content changes', async () => {
      mockRepository.findOne.mockResolvedValue(mockGatewayConfig);
      const updatedConfig = { ...mockGatewayConfig, ...updateDto };
      mockRepository.save.mockResolvedValue(updatedConfig);

      await service.update('test-id', updateDto);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          fileHash: expect.any(String),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a gateway configuration', async () => {
      mockRepository.findOne.mockResolvedValue(mockGatewayConfig);
      mockRepository.save.mockResolvedValue({
        ...mockGatewayConfig,
        deletedAt: new Date(),
      });

      await service.remove('test-id');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      );
    });
  });

  describe('activate', () => {
    it('should activate a configuration and deactivate others', async () => {
      mockRepository.findOne.mockResolvedValue(mockGatewayConfig);
      mockRepository.save.mockResolvedValue({
        ...mockGatewayConfig,
        isActive: true,
      });

      const result = await service.activate('test-id');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { deletedAt: null },
        { isActive: false },
      );
      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a gateway configuration', async () => {
      const activeConfig = { ...mockGatewayConfig, isActive: true };
      mockRepository.findOne.mockResolvedValue(activeConfig);
      mockRepository.save.mockResolvedValue({
        ...activeConfig,
        isActive: false,
      });

      const result = await service.deactivate('test-id');

      expect(result.isActive).toBe(false);
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });
});