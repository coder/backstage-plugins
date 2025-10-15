export interface Config {
  /**
   * @visibility frontend
   */
  coder: {
    /**
     * @deepVisibility frontend
     */
    deployment: {
      accessUrl: string;
    };

    /**
     * @visibility frontend
     */
    oauth: {
      /**
       * @visibility frontend
       */
      clientId: string;

      /**
       * @visibility secret
       */
      clientSecret: string;
    };
  };
}
