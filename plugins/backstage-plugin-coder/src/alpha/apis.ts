import {
  ApiBlueprint,
  discoveryApiRef,
  configApiRef,
  identityApiRef,
} from '@backstage/frontend-plugin-api';
import { UrlSync, urlSyncApiRef } from '../api/UrlSync';
import {
  CoderClientWrapper,
  coderClientWrapperApiRef,
} from '../api/CoderClient';

/**
 * @alpha
 */
export const coderUrlSyncApi = ApiBlueprint.make({
  name: 'url-sync',
  params: defineParams =>
    defineParams({
      api: urlSyncApiRef,
      deps: {
        configApi: configApiRef,
        discoveryApi: discoveryApiRef,
      },
      factory({ configApi, discoveryApi }) {
        return new UrlSync({
          apis: { configApi, discoveryApi },
        });
      },
    }),
});

/**
 * @alpha
 */
export const coderClientWrapperApi = ApiBlueprint.make({
  name: 'client-wrapper',
  params: defineParams =>
    defineParams({
      api: coderClientWrapperApiRef,
      deps: {
        urlSync: urlSyncApiRef,
        identityApi: identityApiRef,
      },
      factory({ urlSync, identityApi }) {
        return new CoderClientWrapper({
          apis: { urlSync, identityApi },
        });
      },
    }),
});
