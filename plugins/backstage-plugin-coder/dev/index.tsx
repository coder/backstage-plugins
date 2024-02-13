import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { coderPlugin, CoderPage } from '../src/plugin';

createDevApp()
  .registerPlugin(coderPlugin)
  .addPage({
    element: <CoderPage />,
    title: 'Root Page',
    path: '/backstage-plugin-coder',
  })
  .render();
