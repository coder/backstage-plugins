import { useDevcontainersConfig } from '../components/DevcontainersProvider';
import { useEntity } from '@backstage/plugin-catalog-react';
import { ANNOTATION_SOURCE_LOCATION } from '@backstage/catalog-model';

export type UseDevcontainersResult = Readonly<
  {
    tagName: string;
  } & (
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
  )
>;

export function useDevcontainers(): UseDevcontainersResult {
  const { tagName } = useDevcontainersConfig();
  const { entity } = useEntity();

  const tags = entity.metadata?.tags ?? [];
  if (!tags.includes(tagName)) {
    return {
      tagName,
      hasUrl: false,
      vsCodeUrl: undefined,
    };
  }

  const repoUrl = entity.metadata.annotations?.[ANNOTATION_SOURCE_LOCATION];
  if (!repoUrl) {
    return {
      tagName,
      hasUrl: false,
      vsCodeUrl: undefined,
    };
  }

  return {
    tagName,
    hasUrl: true,
    vsCodeUrl: serializeVsCodeUrl(repoUrl),
  };
}

function serializeVsCodeUrl(repoUrl: string): string {
  return `vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=${repoUrl}`;
}
