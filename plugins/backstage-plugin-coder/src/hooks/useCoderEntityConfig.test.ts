import { ValiError } from 'valibot';

import { renderHookAsCoderEntity } from '../testHelpers/setup';
import { type CoderWorkspaceConfig } from '../components/CoderProvider';

import {
  mockYamlConfig,
  mockAppConfig,
  mockWorkspaceConfig,
  cleanedRepoUrl,
  rawRepoUrl,
} from '../testHelpers/mockBackstageData';
import {
  CoderEntityConfig,
  compileCoderConfig,
  useCoderEntityConfig,
  type YamlConfig,
} from './useCoderEntityConfig';

describe(`${compileCoderConfig.name}`, () => {
  it('Throws a Valibot ValiError when YAML config is invalid', () => {
    type LooseConfig = Record<keyof YamlConfig, unknown>;
    const wrongStructure: LooseConfig[] = [
      {
        ...mockYamlConfig,
        templateName: 9999,
      },
      {
        ...mockYamlConfig,
        mode: 'oh no',
      },
      {
        ...mockYamlConfig,
        params: {
          value1: () => {
            throw new Error('Just explode please');
          },
          value2: 35,
          value3: NaN,
        },
      },
    ];

    const wrongTypes = [Symbol(), null, 42, () => {}];

    for (const input of [...wrongStructure, ...wrongTypes]) {
      expect(() => {
        compileCoderConfig(mockWorkspaceConfig, input, cleanedRepoUrl);
      }).toThrow(ValiError);
    }
  });

  it('Defers to YAML keys if YAML and baseline params have key conflicts', () => {
    const result = compileCoderConfig(
      mockWorkspaceConfig,
      mockYamlConfig,
      'https://www.github.com/coder/coder',
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<CoderEntityConfig>>({
        templateName: mockYamlConfig.templateName,
        mode: mockYamlConfig.mode,
        params: expect.objectContaining({
          region: mockYamlConfig.params?.region,
        }),
      }),
    );
  });

  it("Uses repoUrlParamKeys to inject repo's URL, always shadowing YAML or baseline configs during key conflicts", () => {
    const url = 'https://www.github.com/google2/the-sequel-to-google';
    const urlKeys = ['one', 'nothing', 'wrong', 'with', 'me'] as const;

    const baselineParams = Object.fromEntries(urlKeys.map(key => [key, '']));
    const baseline: CoderWorkspaceConfig = {
      ...mockWorkspaceConfig,
      repoUrlParamKeys: urlKeys,
      params: baselineParams,
    };

    const yamlParams = Object.fromEntries(urlKeys.map(key => [key, 'blah']));
    const yaml: YamlConfig = {
      ...mockYamlConfig,
      params: yamlParams,
    };

    const result = compileCoderConfig(baseline, yaml, url);
    expect(result.repoUrlParamKeys).toEqual(urlKeys);

    const finalParams = Object.fromEntries(urlKeys.map(key => [key, url]));
    expect(result.params).toEqual(expect.objectContaining(finalParams));
  });

  it('Removes additional URL paths if they are present at the end of the raw URL', () => {
    const result = compileCoderConfig(
      mockWorkspaceConfig,
      mockYamlConfig,
      rawRepoUrl,
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<CoderEntityConfig>>({
        repoUrl: cleanedRepoUrl,
      }),
    );
  });
});

describe(`${useCoderEntityConfig.name}`, () => {
  it('Reads relevant data from CoderProvider, entity, and source control API', () => {
    const { result } = renderHookAsCoderEntity(useCoderEntityConfig);

    expect(result.current).toEqual(
      expect.objectContaining<Partial<CoderEntityConfig>>({
        repoUrl: cleanedRepoUrl,
        templateName: mockYamlConfig.templateName,
        mode: 'auto',
        repoUrlParamKeys: mockAppConfig.workspaces.repoUrlParamKeys,
        params: {
          ...mockAppConfig.workspaces.params,
          region: mockYamlConfig.params?.region ?? '',
          custom_repo: cleanedRepoUrl,
          repo_url: cleanedRepoUrl,
        },
      }),
    );
  });
});
