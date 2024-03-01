import { useDevcontainersConfig } from '../components/DevcontainersProvider';
import { useEntity } from '@backstage/plugin-catalog-react';
import { ANNOTATION_SOURCE_LOCATION } from '@backstage/catalog-model';

export type UseDevcontainersResult = Readonly<
  | {
      /**
       * Indicates whether the current entity component has a devcontainers
       * URL associated with it.
       *
       * This value is set up as a discriminated union for better ergonomics.
       * As long as `hasUrl` is true (and the code has been narrowed with a type
       * guard), `vsCodeUrl` will always be of type string
       */
      hasUrl: false;
      vsCodeUrl: undefined;
    }
  | {
      hasUrl: true;
      vsCodeUrl: string;
    }
>;

const resultWithoutUrl = {
  hasUrl: false,
  vsCodeUrl: undefined,
} as const satisfies UseDevcontainersResult;

export function useDevcontainers(): UseDevcontainersResult {
  const config = useDevcontainersConfig();
  const { entity } = useEntity();

  const tags = entity.metadata?.tags ?? [];
  if (!tags.includes(config.tagName)) {
    return resultWithoutUrl;
  }

  const repoUrl = entity.metadata.annotations?.[ANNOTATION_SOURCE_LOCATION];
  if (!repoUrl) {
    return resultWithoutUrl;
  }

  return {
    hasUrl: true,
    vsCodeUrl: serializeVsCodeUrl(repoUrl),
  };
}

function serializeVsCodeUrl(repoUrl: string): string {
  return `vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=${repoUrl}`;
}
