import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import {
  type DevcontainersConfig,
  DevcontainersProvider,
  devcontainersPlugin,
} from '../src/plugin';

const config: DevcontainersConfig = {};

const SampleComponent = () => {
  return (
    <DevcontainersProvider config={config}>
      <p>This is a component with access to the Devcontainers provider!</p>
    </DevcontainersProvider>
  );
};

createDevApp()
  .registerPlugin(devcontainersPlugin)
  .addPage({
    element: <SampleComponent />,
    title: 'Root Page',
    path: '/backstage-plugin-devcontainers-react',
  })
  .render();
