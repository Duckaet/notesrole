import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

export function createApiResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  }, { status });
}

export function createApiError(
  error: string,
  status: number = 400
): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error,
  }, { status });
}

export function createValidationError(
  message: string
): NextResponse<ApiResponse> {
  return createApiError(message, 400);
}

export function createUnauthorizedError(): NextResponse<ApiResponse> {
  return createApiError('Unauthorized', 401);
}

export function createForbiddenError(): NextResponse<ApiResponse> {
  return createApiError('Forbidden', 403);
}

export function createNotFoundError(resource: string = 'Resource'): NextResponse<ApiResponse> {
  return createApiError(`${resource} not found`, 404);
}

export function createInternalServerError(): NextResponse<ApiResponse> {
  return createApiError('Internal server error', 500);
}