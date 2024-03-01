import { devcontainersPlugin } from './plugin';

describe('backstage-plugin-devcontainers-react', () => {
  it('should export plugin', () => {
    expect(devcontainersPlugin).toBeDefined();
  });
});
