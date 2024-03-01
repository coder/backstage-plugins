import {
  createPlugin,
  createComponentExtension,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const devcontainersPlugin = createPlugin({
  id: 'backstage-plugin-devcontainers-react',
  routes: {
    root: rootRouteRef,
  },
});

/**
 * All public component exports exposed by the plugin.
 */
export const DevcontainersProvider = devcontainersPlugin.provide(
  createComponentExtension({
    name: 'DevcontainersProvider',
    component: {
      lazy: () =>
        import('./components/DevcontainersProvider').then(
          m => m.DevcontainersProvider,
        ),
    },
  }),
);

/**
 * All custom hooks exposed by the plugin.
 */
export { useDevcontainers } from './hooks/useDevcontainers';

/**
 * All custom types
 */
export type { DevcontainersConfig } from './components/DevcontainersProvider';
