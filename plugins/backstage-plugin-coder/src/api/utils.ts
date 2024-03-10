import type { CoderWorkspaceConfig } from '../components/CoderProvider';
import type { Workspace, WorkspaceAgentStatus } from '../typesConstants';

export function serializeWorkspaceUrl(
  config: CoderWorkspaceConfig,
  coderAccessUrl: string,
): string {
  const formattedParams = new URLSearchParams({
    mode: (config.mode ?? 'manual') satisfies CoderWorkspaceConfig['mode'],
  });

  const unformatted = config.params;
  if (unformatted !== undefined && unformatted.hasOwnProperty) {
    for (const key in unformatted) {
      if (!unformatted.hasOwnProperty(key)) {
        continue;
      }

      const value = unformatted[key];
      if (value !== undefined) {
        formattedParams.append(`param.${key}`, value);
      }
    }
  }

  const safeTemplate = encodeURIComponent(config.templateName);
  return `${coderAccessUrl}/templates/${safeTemplate}/workspace?${formattedParams.toString()}`;
}

export function getWorkspaceAgentStatuses(
  workspace: Workspace,
): readonly WorkspaceAgentStatus[] {
  const uniqueStatuses: WorkspaceAgentStatus[] = [];

  for (const resource of workspace.latest_build.resources) {
    if (resource.agents === undefined) {
      continue;
    }

    for (const agent of resource.agents) {
      const status = agent.status;
      if (!uniqueStatuses.includes(status)) {
        uniqueStatuses.push(status);
      }
    }
  }

  return uniqueStatuses;
}

export function isWorkspaceOnline(workspace: Workspace): boolean {
  const latestBuildStatus = workspace.latest_build.status;
  const isAvailable =
    latestBuildStatus !== 'stopped' &&
    latestBuildStatus !== 'stopping' &&
    latestBuildStatus !== 'pending';

  if (!isAvailable) {
    return false;
  }

  const statuses = getWorkspaceAgentStatuses(workspace);
  return statuses.every(
    status => status === 'connected' || status === 'connecting',
  );
}
