import { useMemo } from 'react';

import {
  type Output,
  literal,
  object,
  optional,
  record,
  string,
  undefined_,
  union,
  parse,
} from 'valibot';

import { useApi } from '@backstage/core-plugin-api';
import { scmIntegrationsApiRef } from '@backstage/integration-react';
import {
  getEntitySourceLocation,
  useEntity,
} from '@backstage/plugin-catalog-react';
import {
  useCoderAppConfig,
  type CoderWorkspaceConfig,
} from '../components/CoderProvider';

// Very loose parsing requirements to make interfacing with various kinds of
// YAML files as easy as possible
const yamlConfigSchema = union([
  undefined_(),
  object({
    templateName: optional(string()),
    mode: optional(
      union(
        [literal('manual'), literal('auto')],
        "If defined, createMode must be 'manual' or 'auto'",
      ),
    ),

    params: optional(
      record(
        string(),

        // Defining record value with undefined case as a safety net if user
        // hasn't or can't turn on the noUncheckedIndexedAccess compiler option
        union([string(), undefined_()]),
        'If defined, params must be JSON-serializable as Record<string, string>',
      ),
    ),
  }),
]);

export type YamlConfig = Output<typeof yamlConfigSchema>;

export type CoderEntityConfig = Readonly<
  {
    [Key in keyof CoderWorkspaceConfig]-?: Readonly<CoderWorkspaceConfig[Key]>;
  } & {
    // repoUrl can't be definitely defined because (1) the value comes from an
    // API that also doesn't give you a guarantee, and (2) it shouldn't be
    // defined if repo info somehow isn't available
    repoUrl: string | undefined;
  }
>;

export function compileCoderConfig(
  workspaceSettings: CoderWorkspaceConfig,
  rawYamlConfig: unknown,
  repoUrl: string | undefined,
): CoderEntityConfig {
  const compiledParams: Record<string, string | undefined> = {};
  const yamlConfig = parse(yamlConfigSchema, rawYamlConfig);

  const paramsPrecedence = [workspaceSettings.params, yamlConfig?.params ?? {}];

  // Can't replace this with destructuring, because that is all-or-nothing;
  // there's no easy way to granularly check each property without a loop
  for (const params of paramsPrecedence) {
    for (const key in params) {
      if (params.hasOwnProperty(key) && typeof params[key] === 'string') {
        compiledParams[key] = params[key];
      }
    }
  }

  let cleanedUrl = repoUrl;
  if (repoUrl !== undefined) {
    // repoUrl usually ends with /tree/main/, which breaks Coder's logic for
    // pulling down repos
    cleanedUrl = repoUrl.replace(/\/tree\/main\/?$/, '');
    for (const key of workspaceSettings.repoUrlParamKeys) {
      compiledParams[key] = cleanedUrl;
    }
  }

  return {
    repoUrl: cleanedUrl,
    repoUrlParamKeys: workspaceSettings.repoUrlParamKeys,
    params: compiledParams,
    templateName: yamlConfig?.templateName ?? workspaceSettings.templateName,
    mode: yamlConfig?.mode ?? workspaceSettings.mode ?? 'manual',
  };
}

export function useCoderEntityConfig(): CoderEntityConfig {
  const { entity } = useEntity();
  const appConfig = useCoderAppConfig();
  const sourceControlApi = useApi(scmIntegrationsApiRef);

  const rawYamlConfig = entity.spec?.coder;
  const repoData = getEntitySourceLocation(entity, sourceControlApi);

  return useMemo(() => {
    return compileCoderConfig(
      appConfig.workspaces,
      rawYamlConfig,
      repoData?.locationTargetUrl,
    );
    // Backstage seems to have stabilized the value of rawYamlConfig, so even
    // when it's a object, useMemo shouldn't re-run unnecessarily
  }, [appConfig.workspaces, rawYamlConfig, repoData?.locationTargetUrl]);
}
