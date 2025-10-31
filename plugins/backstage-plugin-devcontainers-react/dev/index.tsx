import { createDevApp } from '@backstage/dev-utils';
import {
  type DevcontainersConfig,
  DevcontainersProvider,
  ExampleDevcontainersComponent,
  devcontainersPlugin,
} from '../src/plugin';

const config: DevcontainersConfig = {};

const SampleComponent = () => {
  return (
    <DevcontainersProvider config={config}>
      <ExampleDevcontainersComponent />
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
