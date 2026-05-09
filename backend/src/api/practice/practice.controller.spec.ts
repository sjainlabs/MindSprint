import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../db/database', () => ({ getDatabase: vi.fn() }));

import { getPracticeQuestions } from './practice.controller';

const mockResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

const mockRequest = (params: Record<string, string>) => ({ params } as unknown as Request);

describe('getPracticeQuestions', () => {
  it('returns 400 for an invalid level', () => {
    const req = mockRequest({ level: 'Expert' });
    const res = mockResponse();

    getPracticeQuestions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Invalid level') }),
    );
  });

  it('returns 10 questions for Beginner level', () => {
    const req = mockRequest({ level: 'Beginner' });
    const res = mockResponse();

    getPracticeQuestions(req, res);

    expect(res.status).not.toHaveBeenCalled();
    const worksheet = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(worksheet.questions).toHaveLength(10);
    expect(worksheet.level).toBe('Beginner');
  });

  it('returns 10 questions for Intermediate level', () => {
    const req = mockRequest({ level: 'Intermediate' });
    const res = mockResponse();

    getPracticeQuestions(req, res);

    const worksheet = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(worksheet.questions).toHaveLength(10);
    expect(worksheet.level).toBe('Intermediate');
  });

  it('returns 10 questions for Advanced level', () => {
    const req = mockRequest({ level: 'Advanced' });
    const res = mockResponse();

    getPracticeQuestions(req, res);

    const worksheet = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(worksheet.questions).toHaveLength(10);
    expect(worksheet.level).toBe('Advanced');
  });

  it('returns 400 for missing level param', () => {
    const req = mockRequest({ level: '' });
    const res = mockResponse();

    getPracticeQuestions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
