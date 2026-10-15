export interface ApiErrorPayload {
  error: {
    code: string;
    message_bn: string;
    request_id: string;
  };
}

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    public readonly messageBn: string
  ) {
    super(messageBn);
    this.name = 'AppError';
  }
}

export function createErrorResponse(
  statusCode: number,
  code: string,
  messageBn: string,
  requestId: string
): { statusCode: number; headers: Record<string, string>; body: string } {
  const payload: ApiErrorPayload = {
    error: {
      code,
      message_bn: messageBn,
      request_id: requestId
    }
  };

  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate, max-age=0',
      'x-content-type-options': 'nosniff',
      'x-request-id': requestId
    },
    body: JSON.stringify(payload)
  };
}
