import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireTerms } from '../server/middleware/auth';
import { TERMS_VERSION } from '../server/config';

// Mock repositories and config to control the return value
vi.mock('../server/repositories', () => {
  return {
    usuariosRepo: {
      getById: vi.fn(),
    },
  };
});

describe('Terms and Conditions Access Control & Aceptar Términos Logic', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let usuariosRepo: any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const repos = await import('../server/repositories');
    usuariosRepo = repos.usuariosRepo;

    mockReq = {
      uid: 'user_123',
      user: { uid: 'user_123' },
      path: '/api/ejercicios',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  it('should call next() if user accepted current terms version', async () => {
    usuariosRepo.getById.mockResolvedValue({
      id: 'user_123',
      terminos_version: TERMS_VERSION,
    });

    await requireTerms(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('should return 403 if user has not accepted terms yet', async () => {
    usuariosRepo.getById.mockResolvedValue({
      id: 'user_123',
      terminos_version: undefined,
    });

    await requireTerms(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'terminos_pendientes' });
  });

  it('should return 403 if user accepted a previous old version', async () => {
    usuariosRepo.getById.mockResolvedValue({
      id: 'user_123',
      terminos_version: 'old_version_2025',
    });

    await requireTerms(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'terminos_pendientes' });
  });

  it('should return 401 if user is not authenticated', async () => {
    mockReq.uid = undefined;
    mockReq.user = undefined;

    await requireTerms(mockReq, mockRes, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
