import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const backstagePluginDevcontainersReactPlugin = createPlugin({
  id: 'backstage-plugin-devcontainers-react',
  routes: {
    root: rootRouteRef,
  },
});

export const BackstagePluginDevcontainersReactPage = backstagePluginDevcontainersReactPlugin.provide(
  createRoutableExtension({
    name: 'BackstagePluginDevcontainersReactPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
