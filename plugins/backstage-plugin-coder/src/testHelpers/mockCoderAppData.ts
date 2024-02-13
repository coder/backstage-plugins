import type {
  Workspace,
  WorkspaceAgent,
  WorkspaceBuild,
  WorkspaceBuildParameter,
  WorkspaceResource,
} from '../typesConstants';

export const mockWorkspaceAgent: WorkspaceAgent = {
  id: 'test-workspace-agent',
  status: 'connected',
};

export const mockWorkspaceResource: WorkspaceResource = {
  id: 'test-workspace-resource',
  agents: [mockWorkspaceAgent],
};

export const mockWorkspaceBuild: WorkspaceBuild = {
  id: 'mock-workspace-build',
  resources: [mockWorkspaceResource],
  status: 'running',
};

export const mockWorkspace: Workspace = {
  id: 'test-workspace',
  name: 'Test-Workspace',
  template_icon: '/emojis/apple.svg',

  owner_name: 'lil brudder',

  latest_build: mockWorkspaceBuild,
};

export const mockWorkspaceBuildParameter: WorkspaceBuildParameter = {
  name: 'goofy',
  value: 'a-hyuck',
};
