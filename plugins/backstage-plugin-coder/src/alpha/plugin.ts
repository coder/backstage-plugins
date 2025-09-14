import { convertLegacyRouteRefs } from '@backstage/core-compat-api';
import { createFrontendPlugin } from '@backstage/frontend-plugin-api';

import { rootRouteRef } from '../routes';

import { coderUrlSyncApi, coderClientWrapperApi } from './apis';
import { coderProviderRootWrapper } from './rootWrappers';
import { coderWorkspacesEntityCard } from './entityCards';

/**
 * @alpha
 */
export const coderPlugin = createFrontendPlugin({
  pluginId: 'coder',
  info: { packageJson: () => import('../../package.json') },
  extensions: [
    coderUrlSyncApi,
    coderClientWrapperApi,
    coderProviderRootWrapper,
    coderWorkspacesEntityCard,
  ],
  routes: convertLegacyRouteRefs({
    root: rootRouteRef,
  }),
});
