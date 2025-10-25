export interface Config {
  /**
   * @visibility frontend
   */
  devcontainers: {
    // Defined with frontend visibility to ensure that it can't conflict with
    // the frontend companion plugin. It needs access to the config values.
    /**
     * @visibility frontend
     */
    tagName: string;
  };
}
