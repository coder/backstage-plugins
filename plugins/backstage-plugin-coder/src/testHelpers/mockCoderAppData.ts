import type { Workspace, WorkspaceBuildParameter } from '../typesConstants';
import { cleanedRepoUrl } from './mockBackstageData';

/**
 * Mock for a workspace that matches the mock repo URL
 */
export const mockWorkspaceWithMatch: Workspace = {
  id: 'workspace-with-match',
  name: 'Test-Workspace',
  template_icon: '/emojis/dog.svg',
  owner_name: 'lil brudder',
  latest_build: {
    id: 'workspace-with-match-build',
    status: 'running',
    resources: [
      {
        id: 'workspace-with-match-resource',
        agents: [{ id: 'test-workspace-agent', status: 'connected' }],
      },
    ],
  },
};

export const mockWorkspaceNoMatch: Workspace = {
  id: 'workspace-no-match',
  name: 'No-match',
  template_icon: '/emojis/star.svg',
  owner_name: 'homestar runner',
  latest_build: {
    id: 'workspace-no-match-build',
    status: 'stopped',
    resources: [
      {
        id: 'workspace-no-match-resource',
        agents: [
          { id: 'test-workspace-agent-a', status: 'disconnected' },
          { id: 'test-workspace-agent-b', status: 'timeout' },
        ],
      },
    ],
  },
};

export const mockWorkspaceNoParameters: Workspace = {
  id: 'workspace-no-parameters',
  name: 'No-parameters',
  template_icon: '/emojis/cheese.png',
  owner_name: 'The Cheat',
  latest_build: {
    id: 'workspace-no-parameters-build',
    status: 'running',
    resources: [
      {
        id: 'workspace-no-parameters-resource',
        agents: [{ id: 'test-workspace-c', status: 'timeout' }],
      },
    ],
  },
};

/**
 * Contains a mix of different workspace variants
 */
export const mockWorkspacesList: Workspace[] = [
  mockWorkspaceWithMatch,
  mockWorkspaceNoMatch,
  mockWorkspaceNoParameters,
];

export const mockWorkspaceBuildParameters: Record<
  string,
  readonly WorkspaceBuildParameter[]
> = {
  [mockWorkspaceWithMatch.latest_build.id]: [
    { name: 'repo_url', value: cleanedRepoUrl },
  ],
  [mockWorkspaceNoMatch.latest_build.id]: [
    { name: 'repo_url', value: 'https://www.github.com/wombo/zom' },
  ],
  [mockWorkspaceNoParameters.latest_build.id]: [
    // Purposefully kept empty
  ],
};

export const mockWorkspaceBuildParameter: WorkspaceBuildParameter = {
  name: 'goofy',
  value: 'a-hyuck',
};
