/**
 * Makes it easier to expose HTTP responses in the event of errors and also
 * gives TypeScript a faster way to type-narrow on those errors
 */
export class BackstageHttpError extends Error {
  #failedResponse: Response;

  constructor(errorMessage: string, failedResponse: Response) {
    super(errorMessage);
    this.name = 'BackstageHttpError';
    this.#failedResponse = failedResponse;
  }

  static isInstance(value: unknown): value is BackstageHttpError {
    return value instanceof BackstageHttpError;
  }

  get status() {
    return this.#failedResponse.status;
  }

  get ok() {
    return this.#failedResponse.ok;
  }

  get contentType() {
    return this.#failedResponse.headers.get('content_type');
  }
}
