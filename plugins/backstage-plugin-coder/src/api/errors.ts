import type { AxiosHeaderValue, AxiosResponse } from 'axios';

/**
 * Makes it easier to expose HTTP responses in the event of errors and also
 * gives TypeScript a faster way to type-narrow on those errors
 */
export class BackstageHttpError extends Error {
  #failedResponse: AxiosResponse;

  constructor(errorMessage: string, failedResponse: AxiosResponse) {
    super(errorMessage);
    this.name = 'BackstageHttpError';
    this.#failedResponse = failedResponse;
  }

  static isInstance(value: unknown): value is BackstageHttpError {
    return value instanceof BackstageHttpError;
  }

  get status(): number {
    return this.#failedResponse.status;
  }

  get ok(): boolean {
    const status = this.#failedResponse.status;
    return !(status >= 200 && status <= 299);
  }

  get contentType(): AxiosHeaderValue | undefined {
    return this.#failedResponse.headers['Content-Type'];
  }
}
