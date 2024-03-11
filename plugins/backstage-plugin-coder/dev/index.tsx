/**
 * @todo Figure out if there's a way to spin up a lightweight backend from this
 * file so that it can serve proxy requests
 *
 * This repo might have some examples to follow:
 * @see {@link https://github.com/RoadieHQ/roadie-backstage-plugins/tree/98b6916a5256cdfa4162d5da43c91cda126f4884/plugins/frontend/backstage-plugin-prometheus}
 */
import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
// import {
//   type RouterOptions,
//   createRouter,
// } from '@backstage/plugin-proxy-backend';
import {
  createApiFactory,
  createRoutableExtension,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import { coderPlugin } from '../src/plugin';
import { rootRouteRef } from '../src/routes';
import { CoderClient, coderClientRef } from '../src/api/coderClient';

/**
 * This extension should only be made available in dev mode, which is why it is
 * not being exported with the other extensions.
 *
 * 2024-02-14 - This does not work just yet – the plugin is able to launch in
 * isolated dev mode, but it needs a running backend process so that it has a
 * proxy to go through. With no backend, all network requests will time out.
 *
 * @todo Figure out how to make proxying available to isolated plugin instances;
 * until then, development will have to be done with a full Backstage app.
 */
const DevEnvironmentPage = coderPlugin.provide(
  createRoutableExtension({
    name: 'CoderDevPage',
    mountPoint: rootRouteRef,
    component: () => import('./DevPage').then(m => m.DevPage),
  }),
);

/**
 * This mirrors the main CoderApiFactory defined in the plugin file. Registering
 * this API and giving it the same coderClientRef will make this API override
 * the API that comes registered with the plugin by default
 *
 * Main benefit is that you can provide additional options to the constructor
 * call, depending on what you're trying to test out - without risks of breaking
 * the main implementation
 */
const devCoderApiFactory = createApiFactory({
  api: coderClientRef,
  deps: { discoveryApi: discoveryApiRef },
  factory: ({ discoveryApi }) => new CoderClient(discoveryApi),
});

createDevApp()
  .registerPlugin(coderPlugin)
  .registerApi(devCoderApiFactory)
  .addPage({
    element: <DevEnvironmentPage />,
    title: 'CoderDevPage',
    path: '/dev',
  })
  .render();
