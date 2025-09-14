import { setupWorker } from 'msw';
import ReactDOM from 'react-dom/client';

import { createApp } from '@backstage/frontend-defaults';
import { scmAuthApiRef } from '@backstage/integration-react';
import appPlugin from '@backstage/plugin-app';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import catalogPlugin from '@backstage/plugin-catalog/alpha';

import coderPlugin from '../src/alpha';
import { catalogApi } from './catalogApiMock';
import { scmAuthApi } from './scmAuthApiMock';
import { handlers } from './handlers';

// Intercepts and mocks the Coder API
const worker = setupWorker();
worker.use(...handlers);
await worker.start();

const appPluginOverrides = appPlugin.withOverrides({
  extensions: [
    appPlugin.getExtension('api:app/scm-auth').override({
      params: defineParams =>
        defineParams({
          api: scmAuthApiRef,
          deps: {},
          factory() {
            return scmAuthApi;
          },
        }),
    }),
  ],
});

const catalogPluginOverrides = catalogPlugin.withOverrides({
  extensions: [
    catalogPlugin.getExtension('api:catalog').override({
      params: defineParams =>
        defineParams({
          api: catalogApiRef,
          deps: {},
          factory: () => catalogApi,
        }),
    }),
  ],
});

const app = createApp({
  features: [appPluginOverrides, catalogPluginOverrides, coderPlugin],
});

const root = app.createRoot();

ReactDOM.createRoot(document.getElementById('root')!).render(root);
