import React, { ForwardedRef, HTMLAttributes, useState } from 'react';
import { useUrlSync } from '../../hooks/useUrlSync';
import { Theme, makeStyles } from '@material-ui/core';

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
    fontSize: '0.625rem',
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
  const { uiHelpers } = useUrlSync();
  const styles = useStyles({ isEmoji: uiHelpers.isEmojiUrl(src) });

  return (
    <div
      aria-hidden
      className={`${styles.root} ${className ?? ''}`}
      {...delegatedProps}
    >
      {hasError ? (
        <span role="none" data-testid="icon-fallback">
          {getFirstLetter(workspaceName)}
        </span>
      ) : (
        <img
          ref={imageRef}
          data-testid="icon-image"
          role="none"
          src={src}
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
