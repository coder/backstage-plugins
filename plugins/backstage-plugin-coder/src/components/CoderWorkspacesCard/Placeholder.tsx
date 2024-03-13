/**
 * @file This is currently being treated as an implementation detail for
 * WorkspacesList. It's just that it's complicated enough to split off into a
 * separate file.
 *
 * This does not need to be exported as a plugin component yet, but that may
 * change in the future.
 */
import React, { PropsWithChildren } from 'react';
import { useWorkspacesCardContext } from './Root';
import { makeStyles } from '@material-ui/core';
import { CoderLogo } from '../CoderLogo';
import { VisuallyHidden } from '../VisuallyHidden';

const usePlaceholderStyles = makeStyles(theme => ({
  root: {
    padding: `${theme.spacing(4)}px 0 ${theme.spacing(5)}px`,
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'center',
  },

  text: {
    textAlign: 'center',
    padding: `0 ${theme.spacing(2.5)}px`,
    fontWeight: 400,
    fontSize: '1.125rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.1,
  },

  linkSpacer: {
    paddingTop: theme.spacing(1.5),
  },

  // Styled as a button to be more apparent to sighted users, but exposed as a
  // link for better right-click/middle-click support and screen reader support
  callToActionLink: {
    fontWeight: 500,
    color: theme.palette.primary.contrastText,
    backgroundColor: theme.palette.primary.main,
    padding: `${theme.spacing(1)}px ${theme.spacing(1.5)}px`,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],

    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: theme.shadows[2],
    },
  },
}));

type PlaceholderProps = Readonly<
  PropsWithChildren<{
    displayCta?: boolean;
  }>
>;

// Placeholder is being treated as an internal implementation detail, and is
// not expected to need much flexibility at the API level
export const Placeholder = ({
  children,
  displayCta = false,
}: PlaceholderProps) => {
  const styles = usePlaceholderStyles();
  const { workspaceCreationLink } = useWorkspacesCardContext();

  return (
    <div className={styles.root}>
      <CoderLogo />
      <p className={styles.text}>{children}</p>

      {displayCta && (
        <div className={styles.linkSpacer}>
          <a
            href={workspaceCreationLink}
            target="_blank"
            className={styles.callToActionLink}
          >
            Create a workspace now!
            <VisuallyHidden> (Link opens in new tab)</VisuallyHidden>
          </a>
        </div>
      )}
    </div>
  );
};
