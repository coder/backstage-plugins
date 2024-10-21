export interface Config {
  /**
   * Properties that concern your Coder deployment.
   * @visibility frontend
   */
  deployment: Readonly<{
    /**
     * The URL where your Coder deployment can be found.
     * @visibility frontend
     */
    accessUrl: string;
  }>;

  /**
   * Properties that concern the creation and manipulation of individual
   * workspaces from within your Coder deployment.
   *
   * @visibility frontend
   */
  workspaces: Readonly<{
    /**
     * The default workspace creation mode to use when making a new workspace
     * from Backstage to Coder.
     *
     * This value can be overwritten with the `mode` property from a repo's
     * app-config.yaml file.
     * @visibility frontend
     */
    defaultMode?: import('./src/hooks/useCoderWorkspacesConfig').WorkspaceCreationMode;

    /**
     * The name of the template that will be used by default when creating a new
     * workspace.
     *
     * This value can be overwritten with the `templateName` property from a
     * repo's app-config-yaml file.
     * @visibility frontend
     */
    defaultTemplateName?: string;

    /**
     * The set of workspace parameters to pass to the Coder deployment when
     * making a new workspace.
     *
     * If a `config` property is defined in app-config.yaml, the keys from the
     * base Backstage config and the keys from the repo's app-config file will
     * be merged, with the repo params always winning any key conflicts.
     * @visibility frontend
     */
    params?: Record<string, string | undefined>;

    /**
     * The key that defines where the URL to a repo can be found from a
     * template.
     *
     * Multiple keys can be defined. In the event that there are multiple keys
     * that provide repo information, the first key in the array will always be
     * chosen.
     * @visibility frontend
     */
    repoUrlParamKeys: readonly string[];
  }>;
}
