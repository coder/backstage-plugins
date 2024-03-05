import {
  createPlugin,
  createComponentExtension,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const coderPlugin = createPlugin({
  id: 'coder',
  routes: {
    root: rootRouteRef,
  },
});

/**
 * All public component exports exposed by the plugin.
 */
export const CoderProvider = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderAuthWrapper',
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
export { useWorkspacesCardContext } from './components/CoderWorkspacesCard/Root';

/**
 * All custom types
 */
export type { CoderAppConfig } from './components/CoderProvider';
