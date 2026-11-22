import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ProblemDetail } from '../models/policy.models';
import { AlertService } from '../services/alert.service';

/** Set on a request when the caller renders its own error UI, so no global alert is raised. */
export const HANDLE_ERROR_LOCALLY = new HttpContextToken<boolean>(() => false);

/**
 * Catches HTTP errors and surfaces them as alerts. Reads RFC 7807 ProblemDetail bodies when present.
 * The error is re-thrown so callers can still reset their own loading state.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const alerts = inject(AlertService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !req.context.get(HANDLE_ERROR_LOCALLY)) {
        const { title, message } = describeHttpError(error);
        alerts.error(title, message);
      }
      return throwError(() => error);
    }),
  );
};

/** Human-readable title/message for any error, preferring ProblemDetail fields. */
export function describeHttpError(error: unknown): { title: string; message: string } {
  if (!(error instanceof HttpErrorResponse)) {
    return { title: 'Unexpected error', message: 'Something went wrong. Please try again.' };
  }
  if (error.status === 0) {
    return {
      title: 'Cannot reach server',
      message: 'The policy service is unavailable. Check your connection and try again.',
    };
  }

  const problem = isProblemDetail(error.error) ? error.error : null;
  const title = problem?.title ?? `Request failed (${error.status})`;
  let message = problem?.detail ?? (error.statusText || 'An unexpected error occurred.');
  if (problem?.errors?.length) {
    message += ': ' + problem.errors.map((e) => `${e.field} ${e.message}`).join('; ');
  }
  return { title, message };
}

function isProblemDetail(body: unknown): body is ProblemDetail {
  return typeof body === 'object' && body !== null && ('title' in body || 'detail' in body);
}
