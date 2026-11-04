import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError } from './api';

/** Maps the backend's field errors onto the form. The backend remains the source of truth. */
export function applyServerErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>, knownFields?: readonly string[]) {
  if (error instanceof ApiError && error.fields.length) {
    let mapped = false;
    for (const f of error.fields) {
      if (!knownFields || knownFields.includes(f.field.split('.')[0])) {
        setError(f.field as Path<T>, { type: 'server', message: f.message });
        mapped = true;
      }
    }
    if (mapped) return;
  }
  toastError(error);
}

export function toastError(error: unknown) {
  if (error instanceof ApiError) {
    toast.error(error.message, { description: error.status >= 500 && error.requestId ? `Request ID: ${error.requestId}` : undefined });
  } else {
    toast.error('Something went wrong. Please try again.');
  }
}

export const isConflict = (error: unknown) => error instanceof ApiError && error.status === 409;

/** For writes that send a version: a conflict means someone else changed the record, so reload it. */
export function writeError(reload?: () => void) {
  return (error: unknown) => {
    if (isConflict(error)) {
      toast.error('This record was changed by someone else. The latest version has been loaded.');
      reload?.();
    } else {
      toastError(error);
    }
  };
}
