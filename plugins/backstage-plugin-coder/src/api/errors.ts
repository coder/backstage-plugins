// Makes it easier to expose HTTP responses in the event of errors and also
// gives TypeScript a faster way to type-narrow on those errors
export class BackstageHttpError extends Error {
  #response: Response;

  constructor(errorMessage: string, response: Response) {
    super(errorMessage);
    this.name = 'HttpError';
    this.#response = response;
  }

  static isInstance(value: unknown): value is BackstageHttpError {
    return value instanceof BackstageHttpError;
  }

  get status() {
    return this.#response.status;
  }

  get ok() {
    return this.#response.ok;
  }

  get contentType() {
    return this.#response.headers.get('content_type');
  }
}
