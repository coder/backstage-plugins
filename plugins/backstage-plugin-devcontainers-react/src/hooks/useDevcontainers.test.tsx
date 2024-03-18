import React from 'react';
import { renderHook } from '@testing-library/react';
import { useDevcontainers } from './useDevcontainers';
import { type DevcontainersConfig, DevcontainersProvider } from '../plugin';
import { wrapInTestApp } from '@backstage/test-utils';
import { EntityProvider, useEntity } from '@backstage/plugin-catalog-react';
import { ANNOTATION_SOURCE_LOCATION } from '@backstage/catalog-model';

const mockTagName = 'devcontainers-test';
const mockUrlRoot = 'https://www.github.com/example-company/example-repo';

type BackstageEntity = ReturnType<typeof useEntity>['entity'];
const mockEntity: BackstageEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'metadata',
    tags: [mockTagName],
    annotations: {
      [ANNOTATION_SOURCE_LOCATION]: `${mockUrlRoot}/tree/main`,
    },
  },
};

function render(tagName: string) {
  const config: DevcontainersConfig = { tagName };

  return renderHook(useDevcontainers, {
    wrapper: ({ children }) =>
      wrapInTestApp(
        <EntityProvider entity={mockEntity}>
          <DevcontainersProvider config={config}>
            {children}
          </DevcontainersProvider>
        </EntityProvider>,
      ),
  });
}

describe(`${useDevcontainers.name}`, () => {
  it('Does not expose a link when the designated devcontainers tag is missing', () => {
    const { result } = render('this-tag-should-not-be-found');
    expect(result.current.vsCodeUrl).toBe(undefined);
  });

  it('Provides a VS Code-formatted link when the current entity has a devcontainers tag', () => {
    const { result } = render(mockTagName);
    expect(result.current.vsCodeUrl).toEqual(
      `vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=${mockUrlRoot}`,
    );
  });
});
