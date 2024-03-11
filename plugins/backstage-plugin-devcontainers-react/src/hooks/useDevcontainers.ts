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

/**
 * Current implementation for generating the URL will likely need to change as
 * we flesh out the backend plugin.
 *
 * It might make more sense to add the direct VSCode link to the entity data
 * from the backend plugin via an annotation field, and remove the need for data
 * cleaning here in this function
 */
function serializeVsCodeUrl(repoUrl: string): string {
  const cleaners: readonly RegExp[] = [/^url: */, /\/tree\/main\/?$/];
  const cleanedUrl = cleaners.reduce((str, re) => str.replace(re, ''), repoUrl);
  return `vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=${cleanedUrl}`;
}
