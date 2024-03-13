import { useMemo, useState } from 'react';

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
export type CoderWorkspacesConfig =
  // Was originally defined in terms of fancy mapped types; ended up being a bad
  // idea, because it increased coupling in a bad way
  Readonly<{
    creationUrl: string;
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
): CoderWorkspacesConfig {
  const { workspaces, deployment } = appConfig;
  const compiledParams: Record<string, string | undefined> = {};
  const yamlConfig = parse(yamlConfigSchema, rawYamlConfig);

  // Can't replace this with destructuring, because that is all-or-nothing;
  // there's no easy way to granularly check each property without a loop
  const paramsPrecedence = [workspaces.params, yamlConfig?.params ?? {}];
  for (const params of paramsPrecedence) {
    for (const key in params) {
      if (params.hasOwnProperty(key) && typeof params[key] === 'string') {
        compiledParams[key] = params[key];
      }
    }
  }

  // repoUrl usually ends with /tree/main/, which breaks Coder's logic for
  // pulling down repos
  let cleanedUrl = repoUrl;
  if (repoUrl !== undefined) {
    cleanedUrl = repoUrl.replace(/\/tree\/[\w._-]+\/?$/, '');
    for (const key of workspaces.repoUrlParamKeys) {
      compiledParams[key] = cleanedUrl;
    }
  }

  const mode = yamlConfig?.mode ?? workspaces.mode ?? 'manual';
  const urlParams = new URLSearchParams({ mode });

  for (const key in compiledParams) {
    // Annoying check that Backstage requires (even though the object
    // referenced is still in the same function scope)
    if (!compiledParams.hasOwnProperty(key)) {
      continue;
    }

    const value = compiledParams[key];
    if (value !== undefined) {
      urlParams.append(`param.${key}`, value);
    }
  }

  const safeTemplate = encodeURIComponent(workspaces.templateName);
  const creationUrl = `${
    deployment.accessUrl
  }/templates/${safeTemplate}/workspace?${urlParams.toString()}`;

  return {
    creationUrl,
    repoUrl: cleanedUrl,
    repoUrlParamKeys: workspaces.repoUrlParamKeys,
    params: compiledParams,
    templateName: yamlConfig?.templateName ?? workspaces.templateName,
    mode: yamlConfig?.mode ?? workspaces.mode ?? 'manual',
  };
}

type UseCoderWorkspacesConfigOptions = Readonly<{
  readEntityData?: boolean;
}>;

export function useCoderWorkspacesConfig({
  readEntityData = false,
}: UseCoderWorkspacesConfigOptions): CoderWorkspacesConfig {
  const appConfig = useCoderAppConfig();
  const { rawYaml, repoUrl } = useDynamicEntity(readEntityData);

  return useMemo(
    () => compileCoderConfig(appConfig, rawYaml, repoUrl),
    // Backstage seems to have stabilized the value of rawYamlConfig, so even
    // when it's a object, useMemo shouldn't re-run unnecessarily
    [appConfig, rawYaml, repoUrl],
  );
}

type UseDynamicEntityResult = Readonly<{
  rawYaml: unknown;
  repoUrl: string | undefined;
}>;

function useDynamicEntity(readEntityData: boolean): UseDynamicEntityResult {
  // Manually checking value change across renders so that if the value changes,
  // we can throw a better error message
  const [initialReadSetting] = useState(readEntityData);
  if (readEntityData !== initialReadSetting) {
    throw new Error(
      'The value of "readEntityData" is not allowed to change across re-renders',
    );
  }

  let rawYaml: unknown = undefined;
  let repoUrl: string | undefined = undefined;

  /* eslint-disable react-hooks/rules-of-hooks --
     Doing conditional hook calls here, but the throw assertion above ensures
     the hook values will be locked in for the lifecycle of the component. The
     hook call order will never change, which is what the rule is trying to
     protect you from */
  if (readEntityData) {
    const { entity } = useEntity();
    const sourceControlApi = useApi(scmIntegrationsApiRef);
    const repoData = getEntitySourceLocation(entity, sourceControlApi);

    rawYaml = entity.spec?.coder;
    repoUrl = repoData?.locationTargetUrl;
  }
  /* eslint-enable react-hooks/rules-of-hooks */

  return { rawYaml, repoUrl } as const;
}
