import { ValiError } from 'valibot';
import { renderHookAsCoderEntity } from '../testHelpers/setup';
import {
  mockYamlConfig,
  mockAppConfig,
  cleanedRepoUrl,
  rawRepoUrl,
  mockCoderWorkspacesConfig,
} from '../testHelpers/mockBackstageData';
import {
  CoderWorkspacesConfig,
  compileCoderConfig,
  useCoderWorkspacesConfig,
  type YamlConfig,
} from './useCoderWorkspacesConfig';
import { CoderAppConfig } from '../plugin';

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
        compileCoderConfig(mockAppConfig, input, cleanedRepoUrl);
      }).toThrow(ValiError);
    }
  });

  it('Defers to YAML keys if YAML and baseline params have key conflicts', () => {
    const result = compileCoderConfig(
      mockAppConfig,
      mockYamlConfig,
      'https://www.github.com/coder/coder',
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<CoderWorkspacesConfig>>({
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

    const baselineAppConfig: CoderAppConfig = {
      ...mockAppConfig,
      workspaces: {
        ...mockAppConfig.workspaces,
        repoUrlParamKeys: urlKeys,
        params: Object.fromEntries(urlKeys.map(key => [key, ''])),
      },
    };

    const yamlParams = Object.fromEntries(urlKeys.map(key => [key, 'blah']));
    const yaml: YamlConfig = { ...mockYamlConfig, params: yamlParams };

    const result = compileCoderConfig(baselineAppConfig, yaml, url);
    expect(result.repoUrlParamKeys).toEqual(urlKeys);

    const finalParams = Object.fromEntries(urlKeys.map(key => [key, url]));
    expect(result.params).toEqual(expect.objectContaining(finalParams));
  });

  it('Removes additional URL paths if they are present at the end of the raw URL', () => {
    const result = compileCoderConfig(
      mockAppConfig,
      mockYamlConfig,
      rawRepoUrl,
    );

    expect(result).toEqual(
      expect.objectContaining<Partial<CoderWorkspacesConfig>>({
        repoUrl: cleanedRepoUrl,
      }),
    );
  });
});

describe(`${useCoderWorkspacesConfig.name}`, () => {
  it('Reads relevant data from CoderProvider, entity, and source control API', async () => {
    const { result } = await renderHookAsCoderEntity(() =>
      useCoderWorkspacesConfig({ readEntityData: true }),
    );

    expect(result.current).toEqual<CoderWorkspacesConfig>({
      mode: mockYamlConfig.mode,
      repoUrl: cleanedRepoUrl,
      creationUrl: mockCoderWorkspacesConfig.creationUrl,
      templateName: mockYamlConfig.templateName,
      repoUrlParamKeys: mockAppConfig.workspaces.repoUrlParamKeys,

      params: {
        ...mockAppConfig.workspaces.params,
        region: mockYamlConfig.params?.region,
        custom_repo: cleanedRepoUrl,
        repo_url: cleanedRepoUrl,
      },
    });
  });
});
