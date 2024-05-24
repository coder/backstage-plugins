/**
 * @file This is a subset of the mock data from the Coder OSS repo. No values
 * are modified; if any values should be patched for Backstage testing, those
 * should be updated in the mockCoderPluginData.ts file.
 *
 * @see {@link https://github.com/coder/coder/blob/main/site/src/testHelpers/entities.ts}
 */
import type * as TypesGen from '../api/vendoredSdk';

const MockOrganization: TypesGen.Organization = {
  id: 'fc0774ce-cc9e-48d4-80ae-88f7a4d4a8b0',
  name: 'Test Organization',
  created_at: '',
  updated_at: '',
  is_default: true,
};

const MockOwnerRole: TypesGen.Role = {
  name: 'owner',
  display_name: 'Owner',
  site_permissions: [],
  organization_permissions: {},
  user_permissions: [],
  organization_id: '',
};

export const MockUser: TypesGen.User = {
  id: 'test-user',
  username: 'TestUser',
  email: 'test@coder.com',
  created_at: '',
  status: 'active',
  organization_ids: [MockOrganization.id],
  roles: [MockOwnerRole],
  avatar_url: 'https://avatars.githubusercontent.com/u/95932066?s=200&v=4',
  last_seen_at: '',
  login_type: 'password',
  theme_preference: '',
  name: '',
};

const MockProvisionerJob: TypesGen.ProvisionerJob = {
  created_at: '',
  id: 'test-provisioner-job',
  status: 'succeeded',
  file_id: MockOrganization.id,
  completed_at: '2022-05-17T17:39:01.382927298Z',
  tags: {
    scope: 'organization',
    owner: '',
    wowzers: 'whatatag',
    isCapable: 'false',
    department: 'engineering',
    dreaming: 'true',
  },
  queue_position: 0,
  queue_size: 0,
};

const MockProvisioner: TypesGen.ProvisionerDaemon = {
  created_at: '2022-05-17T17:39:01.382927298Z',
  id: 'test-provisioner',
  name: 'Test Provisioner',
  provisioners: ['echo'],
  tags: { scope: 'organization' },
  version: 'v2.34.5',
  api_version: '1.0',
};

const MockTemplateVersion: TypesGen.TemplateVersion = {
  id: 'test-template-version',
  created_at: '2022-05-17T17:39:01.382927298Z',
  updated_at: '2022-05-17T17:39:01.382927298Z',
  template_id: 'test-template',
  job: MockProvisionerJob,
  name: 'test-version',
  message: 'first version',
  readme: `---
name:Template test
---
## Instructions
You can add instructions here

[Some link info](https://coder.com)`,
  created_by: MockUser,
  archived: false,
};

const MockWorkspaceAgentLogSource: TypesGen.WorkspaceAgentLogSource = {
  created_at: '2023-05-04T11:30:41.402072Z',
  id: 'dc790496-eaec-4f88-a53f-8ce1f61a1fff',
  display_name: 'Startup Script',
  icon: '',
  workspace_agent_id: '',
};

const MockBuildInfo: TypesGen.BuildInfoResponse = {
  agent_api_version: '1.0',
  external_url: 'file:///mock-url',
  version: 'v99.999.9999+c9cdf14',
  dashboard_url: 'https:///mock-url',
  workspace_proxy: false,
  upgrade_message: 'My custom upgrade message',
  deployment_id: '510d407f-e521-4180-b559-eab4a6d802b8',
};

const MockWorkspaceApp: TypesGen.WorkspaceApp = {
  id: 'test-app',
  slug: 'test-app',
  display_name: 'Test App',
  icon: '',
  subdomain: false,
  health: 'disabled',
  external: false,
  url: '',
  sharing_level: 'owner',
  healthcheck: {
    url: '',
    interval: 0,
    threshold: 0,
  },
};

const MockWorkspaceAgentScript: TypesGen.WorkspaceAgentScript = {
  log_source_id: MockWorkspaceAgentLogSource.id,
  cron: '',
  log_path: '',
  run_on_start: true,
  run_on_stop: false,
  script: "echo 'hello world'",
  start_blocks_login: false,
  timeout: 0,
};

export const MockWorkspaceAgent: TypesGen.WorkspaceAgent = {
  apps: [MockWorkspaceApp],
  architecture: 'amd64',
  created_at: '',
  environment_variables: {},
  id: 'test-workspace-agent',
  name: 'a-workspace-agent',
  operating_system: 'linux',
  resource_id: '',
  status: 'connected',
  updated_at: '',
  version: MockBuildInfo.version,
  api_version: '1.0',
  latency: {
    'Coder Embedded DERP': {
      latency_ms: 32.55,
      preferred: true,
    },
  },
  connection_timeout_seconds: 120,
  troubleshooting_url: 'https://coder.com/troubleshoot',
  lifecycle_state: 'starting',
  logs_length: 0,
  logs_overflowed: false,
  log_sources: [MockWorkspaceAgentLogSource],
  scripts: [MockWorkspaceAgentScript],
  startup_script_behavior: 'non-blocking',
  subsystems: ['envbox', 'exectrace'],
  health: {
    healthy: true,
  },
  display_apps: [
    'ssh_helper',
    'port_forwarding_helper',
    'vscode',
    'vscode_insiders',
    'web_terminal',
  ],
};

export const MockWorkspaceResource: TypesGen.WorkspaceResource = {
  id: 'test-workspace-resource',
  name: 'a-workspace-resource',
  agents: [MockWorkspaceAgent],
  created_at: '',
  job_id: '',
  type: 'google_compute_disk',
  workspace_transition: 'start',
  hide: false,
  icon: '',
  metadata: [{ key: 'size', value: '32GB', sensitive: false }],
  daily_cost: 10,
};

const MockWorkspaceBuild: TypesGen.WorkspaceBuild = {
  build_number: 1,
  created_at: '2022-05-17T17:39:01.382927298Z',
  id: '1',
  initiator_id: MockUser.id,
  initiator_name: MockUser.username,
  job: MockProvisionerJob,
  template_version_id: MockTemplateVersion.id,
  template_version_name: MockTemplateVersion.name,
  transition: 'start',
  updated_at: '2022-05-17T17:39:01.382927298Z',
  workspace_name: 'test-workspace',
  workspace_owner_id: MockUser.id,
  workspace_owner_name: MockUser.username,
  workspace_owner_avatar_url: MockUser.avatar_url,
  workspace_id: '759f1d46-3174-453d-aa60-980a9c1442f3',
  deadline: '2022-05-17T23:39:00.00Z',
  reason: 'initiator',
  resources: [MockWorkspaceResource],
  status: 'running',
  daily_cost: 20,
};

const MockTemplate: TypesGen.Template = {
  id: 'test-template',
  created_at: '2022-05-17T17:39:01.382927298Z',
  updated_at: '2022-05-18T17:39:01.382927298Z',
  organization_id: MockOrganization.id,
  name: 'test-template',
  display_name: 'Test Template',
  provisioner: MockProvisioner.provisioners[0],
  active_version_id: MockTemplateVersion.id,
  active_user_count: 1,
  build_time_stats: {
    start: {
      P50: 1000,
      P95: 1500,
    },
    stop: {
      P50: 1000,
      P95: 1500,
    },
    delete: {
      P50: 1000,
      P95: 1500,
    },
  },
  description: 'This is a test description.',
  default_ttl_ms: 24 * 60 * 60 * 1000,
  activity_bump_ms: 1 * 60 * 60 * 1000,
  autostop_requirement: {
    days_of_week: ['sunday'],
    weeks: 1,
  },
  autostart_requirement: {
    days_of_week: [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
  },
  created_by_id: 'test-creator-id',
  created_by_name: 'test_creator',
  icon: '/icon/code.svg',
  allow_user_cancel_workspace_jobs: true,
  failure_ttl_ms: 0,
  time_til_dormant_ms: 0,
  time_til_dormant_autodelete_ms: 0,
  allow_user_autostart: true,
  allow_user_autostop: true,
  require_active_version: false,
  deprecated: false,
  deprecation_message: '',
  max_port_share_level: 'public',
};

const MockWorkspaceAutostartEnabled: TypesGen.UpdateWorkspaceAutostartRequest =
  {
    // Runs at 9:30am Monday through Friday using Canada/Eastern
    // (America/Toronto) time
    schedule: 'CRON_TZ=Canada/Eastern 30 9 * * 1-5',
  };

export const MockWorkspace: TypesGen.Workspace = {
  id: 'test-workspace',
  name: 'Test-Workspace',
  created_at: '',
  updated_at: '',
  template_id: MockTemplate.id,
  template_name: MockTemplate.name,
  template_icon: MockTemplate.icon,
  template_display_name: MockTemplate.display_name,
  template_allow_user_cancel_workspace_jobs:
    MockTemplate.allow_user_cancel_workspace_jobs,
  template_active_version_id: MockTemplate.active_version_id,
  template_require_active_version: MockTemplate.require_active_version,
  outdated: false,
  owner_id: MockUser.id,
  organization_id: MockOrganization.id,
  owner_name: MockUser.username,
  owner_avatar_url: 'https://avatars.githubusercontent.com/u/7122116?v=4',
  autostart_schedule: MockWorkspaceAutostartEnabled.schedule,
  ttl_ms: 2 * 60 * 60 * 1000,
  latest_build: MockWorkspaceBuild,
  last_used_at: '2022-05-16T15:29:10.302441433Z',
  health: {
    healthy: true,
    failing_agents: [],
  },
  automatic_updates: 'never',
  allow_renames: true,
  favorite: false,
};
