import { HttpErrorResponse } from '@angular/common/http';

/**
 * Error from the /api/tests/* endpoints. The backend sends { error: { code, message } } and the
 * message is written for the student, so it can be shown as is.
 */
export class TestApiError<Code extends string = string> extends Error {
  constructor(
    readonly code: Code | 'NETWORK' | 'UNKNOWN',
    message: string,
    readonly httpStatus = 0,
  ) {
    super(message);
  }
}

export function toTestApiError<Code extends string>(err: unknown): TestApiError<Code> {
  if (err instanceof HttpErrorResponse) {
    const body = err.error?.error;
    if (body?.code) {
      return new TestApiError<Code>(body.code, body.message ?? 'Something went wrong.', err.status);
    }
    if (err.status === 0) {
      return new TestApiError<Code>('NETWORK', 'Could not reach the server. Check your connection and try again.');
    }
    return new TestApiError<Code>('UNKNOWN', 'Something went wrong. Please try again.', err.status);
  }
  return new TestApiError<Code>('UNKNOWN', 'Something went wrong. Please try again.');
}
