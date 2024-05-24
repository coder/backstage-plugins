import { User } from '../api/vendoredSdk';
import type { Workspace } from '../api/vendoredSdk';
import { MockUser } from './coderEntities';
import {
  mockBackstageApiEndpoint,
  mockBackstageAssetsEndpoint,
} from './mockBackstageData';

export const mockUserWithProxyUrls: User = {
  ...MockUser,
  avatar_url: `${mockBackstageAssetsEndpoint}/blueberry.png`,
};

/**
 * The main mock for a workspace whose repo URL matches cleanedRepoUrl
 */
export const mockWorkspaceWithMatch: Workspace = {
  id: 'workspace-with-match',
  name: 'Test-Workspace',
  template_icon: `${mockBackstageApiEndpoint}/emojis/dog.svg`,
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

/**
 * A secondary mock for a workspace whose repo URL matches cleanedRepoUrl.
 *
 * Mainly here for asserting that things like search functionality are able to
 * return multiple values back
 */
export const mockWorkspaceWithMatch2: Workspace = {
  id: 'workspace-with-match-2',
  name: 'Another-Test',
  template_icon: `${mockBackstageApiEndpoint}/emojis/z.svg`,
  owner_name: 'Coach Z',
  latest_build: {
    id: 'workspace-with-match-2-build',
    status: 'running',
    resources: [
      {
        id: 'workspace-with-match-2-resource',
        agents: [{ id: 'test-workspace-agent', status: 'connected' }],
      },
    ],
  },
};

/**
 * Mock for a workspace that has a repo URL, but the URL doesn't match
 * cleanedRepoUrl
 */
export const mockWorkspaceNoMatch: Workspace = {
  id: 'workspace-no-match',
  name: 'No-match',
  template_icon: `${mockBackstageApiEndpoint}/emojis/star.svg`,
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

/**
 * A workspace with no build parameters whatsoever
 */
export const mockWorkspaceNoParameters: Workspace = {
  id: 'workspace-no-parameters',
  name: 'No-parameters',
  template_icon: `${mockBackstageApiEndpoint}/emojis/cheese.png`,
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
  mockWorkspaceWithMatch2,
  mockWorkspaceNoMatch,
  mockWorkspaceNoParameters,
];

export const mockWorkspacesListForRepoSearch: Workspace[] = [
  mockWorkspaceWithMatch,
  mockWorkspaceWithMatch2,
];
