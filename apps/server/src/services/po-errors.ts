export type PoCatalogErrorKind = 'parse' | 'normalize';

export interface PoCatalogErrorDetails {
  [key: string]: unknown;
}

export class PoCatalogError extends Error {
  readonly kind: PoCatalogErrorKind;
  readonly code: string;
  readonly details?: PoCatalogErrorDetails;

  constructor(
    kind: PoCatalogErrorKind,
    code: string,
    message: string,
    details?: PoCatalogErrorDetails,
  ) {
    super(message);
    this.name = 'PoCatalogError';
    this.kind = kind;
    this.code = code;
    this.details = details;
  }
}

export function isPoCatalogError(error: unknown): error is PoCatalogError {
  return error instanceof PoCatalogError;
}
