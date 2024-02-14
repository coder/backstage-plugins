import React from 'react';
import { createDevApp } from '@backstage/dev-utils';

import { coderPlugin } from '../src/plugin';
import { createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef } from '../src/routes';

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

createDevApp()
  .registerPlugin(coderPlugin)
  .addPage({
    element: <DevEnvironmentPage />,
    title: 'CoderDevPage',
    path: '/dev',
  })
  .render();
