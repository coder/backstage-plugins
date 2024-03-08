import {
  createPlugin,
  createComponentExtension,
  createApiFactory,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { CoderClient, coderClientRef } from './api/coderClient';

const coderApiFactory = createApiFactory({
  api: coderClientRef,
  deps: { discoveryApi: discoveryApiRef },
  factory: ({ discoveryApi }) => new CoderClient(discoveryApi),
});

export const coderPlugin = createPlugin({
  id: 'coder',
  routes: { root: rootRouteRef },
  apis: [coderApiFactory],
});

/**
 * All public component exports exposed by the plugin.
 */
export const CoderProvider = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderProvider',
    component: {
      lazy: () =>
        import('./components/CoderProvider').then(m => m.CoderProvider),
    },
  }),
);

export const CoderAuthWrapper = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderAuthWrapper',
    component: {
      lazy: () =>
        import('./components/CoderAuthWrapper').then(m => m.CoderAuthWrapper),
    },
  }),
);

export const CoderErrorBoundary = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderAuthWrapper',
    component: {
      lazy: () =>
        import('./components/CoderErrorBoundary').then(
          m => m.CoderErrorBoundary,
        ),
    },
  }),
);

export const CoderWorkspacesCard = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderAuthWrapper',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(
          m => m.CoderWorkspacesCard,
        ),
    },
  }),
);

/**
 * All custom hooks exposed by the plugin.
 */
export { useCoderEntityConfig } from './hooks/useCoderEntityConfig';
export { useCoderWorkspaces } from './hooks/useCoderWorkspaces';

/**
 * All custom types
 */
export type { CoderAppConfig } from './components/CoderProvider';
