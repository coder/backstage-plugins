import {
  type ForwardedRef,
  type HTMLAttributes,
  useState,
  useEffect,
} from 'react';
import { useUrlSync } from '../../hooks/useUrlSync';
import { useInternalCoderAuth } from '../CoderProvider';
import { useCoderApi } from '../../hooks/useCoderApi';
import { Theme, makeStyles } from '@material-ui/core';
import { scaleCssUnit } from '../../utils/styling';

type WorkspaceListIconProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-hidden'> & {
    src: string;
    workspaceName: string;
    imageClassName?: string;
    imageRef?: ForwardedRef<HTMLImageElement>;
  }
>;

type StyleKey = 'root' | 'image';

type MakeStylesInput = Readonly<{
  isEmoji: boolean;
}>;

const useStyles = makeStyles<Theme, MakeStylesInput, StyleKey>(theme => ({
  root: {
    width: theme.spacing(2.5),
    height: theme.spacing(2.5),
    fontSize: scaleCssUnit(theme.typography.body1.fontSize, 0.625),
    backgroundColor: theme.palette.background.default,
    borderRadius: '9999px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',

    // Necessary to make sure that super-wide workspace names in
    // WorkspaceListItem don't cause the icon to get squished when the list item
    // runs out of room
    flexShrink: 0,
  },

  image: ({ isEmoji }) => {
    // Have to shrink emoji icons to make sure they don't get cut off by border
    // radius removing corners from the image container
    const imageScalePercent = isEmoji ? 65 : 100;

    return {
      width: `${imageScalePercent}%`,
      height: `${imageScalePercent}%`,
      borderRadius: '9999px',
    };
  },
}));

export const WorkspacesListIcon = ({
  src,
  workspaceName,
  className,
  imageClassName,
  imageRef,
  ...delegatedProps
}: WorkspaceListIconProps) => {
  const [hasError, setHasError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const { renderHelpers } = useUrlSync();
  const auth = useInternalCoderAuth();
  const coderApi = useCoderApi();
  const styles = useStyles({ isEmoji: renderHelpers.isEmojiUrl(src) });

  useEffect(() => {
    if (!auth.isAuthenticated) {
      setHasError(true);
      return undefined;
    }

    let isMounted = true;

    const fetchIcon = async () => {
      try {
        const response = await coderApi.getAxiosInstance().get(src, {
          responseType: 'blob',
        });

        const blob = response.data as Blob;
        const url = URL.createObjectURL(blob);

        if (isMounted) {
          setBlobUrl(url);
        }
      } catch (error) {
        if (isMounted) {
          setHasError(true);
        }
      }
    };

    fetchIcon();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, auth.isAuthenticated]);

  return (
    <div
      aria-hidden
      className={`${styles.root} ${className ?? ''}`}
      {...delegatedProps}
    >
      {hasError || !blobUrl ? (
        <span role="none" data-testid="icon-fallback">
          {getFirstLetter(workspaceName)}
        </span>
      ) : (
        <img
          ref={imageRef}
          data-testid="icon-image"
          role="none"
          src={blobUrl}
          alt="" // Empty because icon should be purely decorative
          onError={() => setHasError(true)}
          className={`${styles.image} ${imageClassName ?? ''}`}
        />
      )}
    </div>
  );
};

const firstLetterRe = /([a-zA-Z])/;
function getFirstLetter(text: string): string {
  const [, firstLetter] = firstLetterRe.exec(text) ?? [];
  return (firstLetter ?? 'W').toUpperCase();
}
