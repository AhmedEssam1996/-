import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/** Error codes surfaced to the client. UI maps these to Arabic copy. */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ACCOUNT_DISABLED'
  | 'RATE_LIMIT'
  | 'QUOTA_EXCEEDED'
  | 'FEATURE_DISABLED'
  | 'MAINTENANCE'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_OUTPUT'
  | 'DB_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string; details?: unknown };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, details } }, { status });
}

export function apiOk<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json<T>(data, init);
}

/** Arabic-friendly messages for domain errors thrown deep in the stack. */
const FRIENDLY: Record<ApiErrorCode, string> = {
  VALIDATION_ERROR: 'في بيانات ناقصة أو غير صحيحة. راجع الحقول وجرّب تاني.',
  AUTH_REQUIRED: 'لازم تسجّل دخول الأول.',
  FORBIDDEN: 'مش مسموح لك بالوصول للصفحة دي.',
  NOT_FOUND: 'الحاجة اللي بتدور عليها مش موجودة.',
  CONFLICT: 'في تعارض في البيانات. جرّب تاني.',
  ACCOUNT_DISABLED: 'حسابك متوقف حاليًا. تواصل مع الدعم.',
  RATE_LIMIT: 'بعّد شوية وجرّب تاني.',
  QUOTA_EXCEEDED: 'وصلت للحد المسموح من استخدام الذكاء الاصطناعي. هيرجع تاني قريب.',
  FEATURE_DISABLED: 'الخاصية دي متوقفة حاليًا.',
  MAINTENANCE: 'الموقع تحت الصيانة حاليًا. نرجعلك قريب.',
  AI_UNAVAILABLE: 'حصلت مشكلة بسيطة أثناء إنشاء الهدية. جرّب مرة أخرى.',
  AI_INVALID_OUTPUT: 'الرد اللي وصلنا مش مظبوط. جرّب توليد نسخة تانية.',
  DB_UNAVAILABLE: 'قاعدة البيانات مش متاحة حاليًا. جرّب تاني بعد شوية.',
  INTERNAL_ERROR: 'حصلت مشكلة بسيطة. جرّب مرة أخرى.',
};

export function friendlyMessage(code: ApiErrorCode): string {
  return FRIENDLY[code] ?? 'حصلت مشكلة بسيطة. جرّب مرة أخرى.';
}

/**
 * Converts a ZodError into a user-safe validation error.
 * Field paths are included (useful for form highlighting) but raw values are not.
 */
export function fromZodError(error: ZodError): ApiError {
  const details = error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  return new ApiError('VALIDATION_ERROR', friendlyMessage('VALIDATION_ERROR'), 422, details);
}

/** Parses a JSON body, rejecting oversized or malformed payloads. */
export async function readJsonBody(request: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (contentLength > maxBytes) {
    throw new ApiError('VALIDATION_ERROR', 'الطلب أكبر من المسموح.', 413);
  }

  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new ApiError('VALIDATION_ERROR', 'الطلب أكبر من المسموح.', 413);
  }
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'صيغة الطلب غير صحيحة.', 400);
  }
}