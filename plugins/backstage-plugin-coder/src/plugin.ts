import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const backstagePluginCoderPlugin = createPlugin({
  id: 'backstage-plugin-coder',
  routes: {
    root: rootRouteRef,
  },
});

export const BackstagePluginCoderPage = backstagePluginCoderPlugin.provide(
  createRoutableExtension({
    name: 'BackstagePluginCoderPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
