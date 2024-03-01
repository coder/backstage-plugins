import { backstagePluginDevcontainersReactPlugin } from './plugin';

describe('backstage-plugin-devcontainers-react', () => {
  it('should export plugin', () => {
    expect(backstagePluginDevcontainersReactPlugin).toBeDefined();
  });
});
