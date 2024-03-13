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
  type CoderAppConfig,
  useCoderAppConfig,
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

/**
 * Provides a cleaned and pre-processed version of all repo data that can be
 * sourced from CoderAppConfig and any entity data.
 */
export type CoderEntityConfig =
  // Was originally defined in terms of fancy mapped types; ended up being a bad
  // idea, because it increased coupling in a bad way
  Readonly<{
    templateName: string;
    repoUrlParamKeys: readonly string[];
    mode: 'manual' | 'auto';
    params: Record<string, string | undefined>;

    // Always undefined if repo data is not available for any reason
    repoUrl: string | undefined;
  }>;

export function compileCoderConfig(
  appConfig: CoderAppConfig,
  rawYamlConfig: unknown,
  repoUrl: string | undefined,
): CoderEntityConfig {
  const workspaceSettings = appConfig.workspaces;
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
    cleanedUrl = repoUrl.replace(/\/tree\/[\w._-]+\/?$/, '');
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

type UseCoderEntityConfigOptions = Readonly<{
  readEntityData?: boolean;
}>;

export function useCoderEntityConfig({
  readEntityData = true,
}: UseCoderEntityConfigOptions): CoderEntityConfig {
  const { entity } = useEntity();
  const appConfig = useCoderAppConfig();
  const sourceControlApi = useApi(scmIntegrationsApiRef);

  const rawYamlConfig = entity.spec?.coder;
  const repoData = getEntitySourceLocation(entity, sourceControlApi);

  return useMemo(() => {
    return compileCoderConfig(
      appConfig,
      rawYamlConfig,
      repoData?.locationTargetUrl,
    );
    // Backstage seems to have stabilized the value of rawYamlConfig, so even
    // when it's a object, useMemo shouldn't re-run unnecessarily
  }, [appConfig, rawYamlConfig, repoData?.locationTargetUrl]);
}
