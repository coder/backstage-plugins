import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { backstagePluginDevcontainersReactPlugin, BackstagePluginDevcontainersReactPage } from '../src/plugin';

createDevApp()
  .registerPlugin(backstagePluginDevcontainersReactPlugin)
  .addPage({
    element: <BackstagePluginDevcontainersReactPage />,
    title: 'Root Page',
    path: '/backstage-plugin-devcontainers-react'
  })
  .render();
