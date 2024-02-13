import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export * from './components/CoderProvider';
export * from './components/CoderErrorBoundary';
export * from './components/CoderWorkspacesCard';

export const coderPlugin = createPlugin({
  id: 'coder',
  routes: {
    root: rootRouteRef,
  },
});

export const CoderPage = coderPlugin.provide(
  createRoutableExtension({
    name: 'CoderPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
