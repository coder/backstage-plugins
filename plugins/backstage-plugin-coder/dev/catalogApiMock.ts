import { catalogApiMock } from '@backstage/plugin-catalog-react/testUtils';

export const catalogApi = catalogApiMock({
  entities: [
    {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Component',
      metadata: {
        name: 'python-project',
      },
      spec: {
        type: 'other',
        owner: 'pms',
        lifecycle: 'unknown',
        coder: {
          templateName: 'devcontainers',
          mode: 'auto',
          params: {
            repo: 'custom',
            region: 'us-pittsburgh',
          },
        },
      },
    },
  ],
});
