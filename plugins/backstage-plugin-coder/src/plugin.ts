import {
  createPlugin,
  createComponentExtension,
  createApiFactory,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';
import { CoderTokenAuth, coderTokenAuthApiRef } from './api/CoderTokenAuth';
import { CoderClient, coderClientApiRef } from './api/CoderClient';

export const coderPlugin = createPlugin({
  id: 'coder',
  routes: { root: rootRouteRef },
  apis: [
    createApiFactory({
      api: coderTokenAuthApiRef,
      deps: { discoveryApi: discoveryApiRef },
      factory: ({ discoveryApi }) => new CoderTokenAuth(discoveryApi),
    }),

    createApiFactory({
      api: coderClientApiRef,
      deps: { discoveryApi: discoveryApiRef, authApi: coderTokenAuthApiRef },
      factory: ({ discoveryApi, authApi }) => {
        return new CoderClient(discoveryApi, authApi);
      },
    }),
  ],
});

/**
 * All public component exports exposed by the plugin.
 *
 * Make sure that all name properties for each exported component are unique. If
 * there are conflicts, you could run into Backstage compilation issues with no
 * good error messages to help you track down the source.
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
    name: 'CoderErrorBoundary',
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
    name: 'CoderWorkspacesCard',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(
          m => m.CoderWorkspacesCard,
        ),
    },
  }),
);

export const CoderWorkspacesCardCreateWorkspacesLink = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.CreateWorkspacesLink',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(
          m => m.CreateWorkspaceLink,
        ),
    },
  }),
);

export const CoderWorkspacesCardExtraActionsButton = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.ExtraActionsButton',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(
          m => m.ExtraActionsButton,
        ),
    },
  }),
);

export const CoderWorkspacesCardHeaderRow = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.HeaderRow',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(m => m.HeaderRow),
    },
  }),
);

export const CoderWorkspacesCardRoot = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.Root',
    component: {
      lazy: () => import('./components/CoderWorkspacesCard').then(m => m.Root),
    },
  }),
);

export const CoderWorkspacesCardSearchBox = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.SearchBox',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(m => m.SearchBox),
    },
  }),
);

export const CoderWorkspacesCardWorkspacesList = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.WorkspacesList',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(m => m.WorkspacesList),
    },
  }),
);

export const CoderWorkspacesCardWorkspacesListIcon = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.WorkspacesListIcon',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(
          m => m.WorkspacesListIcon,
        ),
    },
  }),
);

export const CoderWorkspacesCardWorkspacesListItem = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.WorkspacesListItem',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(
          m => m.WorkspacesListItem,
        ),
    },
  }),
);

export const CoderWorkspacesReminderAccordion = coderPlugin.provide(
  createComponentExtension({
    name: 'CoderWorkspacesCard.ReminderAccordion',
    component: {
      lazy: () =>
        import('./components/CoderWorkspacesCard').then(
          m => m.ReminderAccordion,
        ),
    },
  }),
);

/**
 * All custom hooks exposed by the plugin.
 */
export { useCoderWorkspacesConfig } from './hooks/useCoderWorkspacesConfig';
export { useCoderWorkspacesQuery } from './hooks/useCoderWorkspacesQuery';
export { useWorkspacesCardContext } from './components/CoderWorkspacesCard/Root';

/**
 * All custom types
 */
export type { CoderAppConfig } from './components/CoderProvider';
