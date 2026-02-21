import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

export function getRequestId(request: Request): string {
  const headerRequestId = request.headers.get('x-request-id')?.trim();
  if (headerRequestId) return headerRequestId;

  return randomUUID();
}

export function withRequestId(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('x-request-id', requestId);
  return response;
}

export function jsonWithRequestId(
  payload: unknown,
  requestId: string,
  options?: { status?: number },
): NextResponse {
  const response = NextResponse.json(payload, options);
  response.headers.set('x-request-id', requestId);
  return response;
}
