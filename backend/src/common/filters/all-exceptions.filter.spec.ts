import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function makeHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: 'GET', url: '/v1/things', originalUrl: '/api/v1/things' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('maps a plain NotFoundException to a 404 NOT_FOUND envelope', () => {
    const { host, status, json } = makeHost();

    filter.catch(new NotFoundException('Member not found.'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found.' },
        path: '/api/v1/things',
      }),
    );
  });

  it('lifts class-validator message arrays into `details` on a 400', () => {
    const { host, status, json } = makeHost();

    filter.catch(
      new BadRequestException({
        message: ['email must be an email', 'name should not be empty'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: ['email must be an email', 'name should not be empty'],
        },
      }),
    );
  });

  it('maps an unrecognized error to a safe 500 without leaking internals', () => {
    const { host, status, json } = makeHost();

    filter.catch(new Error('connection refused at 10.0.0.5:5432'), host);

    expect(status).toHaveBeenCalledWith(500);
    const [body] = json.mock.calls[0] as [{ error: { code: string; message: string } }];
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toContain('10.0.0.5');
  });
});
