/**
 * @file This is a temporary (and significantly limited) implementation of the
 * "Coder SDK" that will eventually be imported from Coder core
 *
 * @todo Replace this with a full, proper implementation, and then expose it to
 * plugin users.
 */
import globalAxios, { type AxiosInstance } from 'axios';
import {
  type User,
  type WorkspacesRequest,
  type WorkspaceBuildParameter,
  type WorkspacesResponse,
} from '../typesConstants';

type CoderSdkApi = {
  getAuthenticatedUser: () => Promise<User>;
  getWorkspaces: (request: WorkspacesRequest) => Promise<WorkspacesResponse>;
  getWorkspaceBuildParameters: (
    workspaceBuildId: string,
  ) => Promise<readonly WorkspaceBuildParameter[]>;
};

export class CoderSdk implements CoderSdkApi {
  private readonly axios: AxiosInstance;

  constructor(axiosInstance?: AxiosInstance) {
    this.axios = axiosInstance ?? globalAxios.create();
  }

  getWorkspaces = async (
    request: WorkspacesRequest,
  ): Promise<WorkspacesResponse> => {
    const urlParams = new URLSearchParams({
      q: request.q ?? '',
      limit: String(request.limit || 0),
      after_id: request.after_id ?? '',
      offset: String(request.offset || 0),
    });

    const response = await this.axios.get<WorkspacesResponse>(
      `/workspaces?${urlParams.toString()}`,
    );

    return response.data;
  };

  getWorkspaceBuildParameters = async (
    workspaceBuildId: string,
  ): Promise<readonly WorkspaceBuildParameter[]> => {
    const response = await this.axios.get<readonly WorkspaceBuildParameter[]>(
      `/workspacebuilds/${workspaceBuildId}/parameters`,
    );

    return response.data;
  };

  getAuthenticatedUser = async (): Promise<User> => {
    const response = await this.axios.get<User>('/users/me');
    return response.data;
  };
}
