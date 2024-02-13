import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { backstagePluginCoderPlugin, BackstagePluginCoderPage } from '../src/plugin';

createDevApp()
  .registerPlugin(backstagePluginCoderPlugin)
  .addPage({
    element: <BackstagePluginCoderPage />,
    title: 'Root Page',
    path: '/backstage-plugin-coder'
  })
  .render();
