import { renderHook, waitFor } from '@testing-library/react';
import { useDevcontainers } from './useDevcontainers';
import { type DevcontainersConfig, DevcontainersProvider } from '../plugin';
import { wrapInTestApp } from '@backstage/test-utils';
import { EntityProvider, useEntity } from '@backstage/plugin-catalog-react';

const mockTagName = 'devcontainers-test';
const mockUrlRoot = 'https://www.github.com/example-company/example-repo';

type BackstageEntity = ReturnType<typeof useEntity>['entity'];
const baseEntity: BackstageEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'metadata',
    tags: [mockTagName, 'other', 'random', 'values'],
    annotations: {
      vsCodeUrl: `vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=${mockUrlRoot}`,
    },
  },
};

async function render(tagName: string, entity: BackstageEntity) {
  const config: DevcontainersConfig = { tagName };

  const output = renderHook(useDevcontainers, {
    wrapper: ({ children }) =>
      wrapInTestApp(
        <EntityProvider entity={entity}>
          <DevcontainersProvider config={config}>
            {children}
          </DevcontainersProvider>
        </EntityProvider>,
      ),
  });

  // The mock Backstage client needs a little bit of time to spin up for the
  // first render, but will be ready to go for all test cases after that. In
  // practice, this means that unless you wait for the hook result to be
  // rendered and ejected via the wrapper, the first test case will ALWAYS fail,
  // no matter what it does. Have to make all test cases async to ensure that
  // shuffling test cases around doesn't randomly kick up false positives
  await waitFor(() => expect(output.result.current).not.toBe(null));
  return output;
}

describe(`${useDevcontainers.name}`, () => {
  it('Does not expose a link when the designated devcontainers tag is missing', async () => {
    const { result: result1 } = await render('tag-not-found', baseEntity);
    const { result: result2 } = await render(mockTagName, {
      ...baseEntity,
      metadata: {
        ...baseEntity.metadata,
        tags: [],
      },
    });

    expect(result1.current.vsCodeUrl).toBe(undefined);
    expect(result2.current.vsCodeUrl).toBe(undefined);
  });

  it('Does not expose a link when the entity lacks one', async () => {
    const { result } = await render(mockTagName, {
      ...baseEntity,
      metadata: {
        ...baseEntity.metadata,
        annotations: {},
      },
    });

    expect(result.current.vsCodeUrl).toBe(undefined);
  });

  it('Exposes the link when the entity has both the tag and link', async () => {
    const { result } = await render(mockTagName, baseEntity);
    expect(result.current.vsCodeUrl).toEqual(
      `vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=${mockUrlRoot}`,
    );
  });
});
