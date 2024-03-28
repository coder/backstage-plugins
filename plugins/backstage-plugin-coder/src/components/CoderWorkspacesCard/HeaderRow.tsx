import React, { HTMLAttributes, ReactNode } from 'react';
import { Theme, makeStyles } from '@material-ui/core';
import { useWorkspacesCardContext } from './Root';

type StyleKey = 'root' | 'header' | 'hgroup' | 'subheader';

type MakeStylesInputs = Readonly<{
  fullBleedLayout: boolean;
}>;

const useStyles = makeStyles<Theme, MakeStylesInputs, StyleKey>(theme => ({
  root: ({ fullBleedLayout }) => ({
    color: theme.palette.text.primary,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    gap: theme.spacing(1),

    // Have to jump through some hoops for the border; have to extend out the
    // root to make sure that the border stretches all the way across the
    // parent, and then add padding back to just the main content
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginLeft: fullBleedLayout ? `-${theme.spacing(2)}px` : 0,
    marginRight: fullBleedLayout ? `-${theme.spacing(2)}px` : 0,
    padding: `0 ${theme.spacing(2)}px ${theme.spacing(2)}px ${theme.spacing(
      2.5,
    )}px`,
  }),

  hgroup: {
    marginRight: 'auto',
  },

  header: {
    fontSize: '24px',
    lineHeight: 1,
    margin: 0,
  },

  subheader: {
    margin: '0',
    color: theme.palette.text.secondary,
    paddingTop: theme.spacing(0.5),
  },
}));

type HtmlHeader = `h${1 | 2 | 3 | 4 | 5 | 6}`;
type ClassName = `${Exclude<StyleKey, 'root'>}ClassName`;

type HeaderProps = Readonly<
  Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
    Partial<Record<ClassName, string>> & {
      headerText?: string;
      headerLevel?: HtmlHeader;
      actions?: ReactNode;
      fullBleedLayout?: boolean;
      activeRepoFilteringText?: string | ReactNode;
    }
>;

export const HeaderRow = ({
  actions,
  headerLevel,
  className,
  headerClassName,
  hgroupClassName,
  subheaderClassName,
  activeRepoFilteringText,
  headerText = 'Coder Workspaces',
  fullBleedLayout = true,
  ...delegatedProps
}: HeaderProps) => {
  const { headerId, workspacesConfig } = useWorkspacesCardContext();
  const styles = useStyles({ fullBleedLayout });

  const HeadingComponent = headerLevel ?? 'h2';
  const { repoUrl } = workspacesConfig;

  return (
    <div className={`${styles.root} ${className ?? ''}`} {...delegatedProps}>
      <hgroup className={`${styles.hgroup} ${hgroupClassName ?? ''}`}>
        <HeadingComponent
          id={headerId}
          className={`${styles.header} ${headerClassName ?? ''}`}
        >
          {headerText}
        </HeadingComponent>

        {repoUrl && (
          <p className={`${styles.subheader} ${subheaderClassName ?? ''}`}>
            {activeRepoFilteringText ?? (
              <>Results filtered by {extractRepoName(repoUrl)}</>
            )}
          </p>
        )}
      </hgroup>

      {actions}
    </div>
  );
};

/**
 * Parses the repo name from GitHub/GitLab/Bitbucket, which should be the last
 * segment of the URL after it's been cleaned by the CoderConfig
 */
const repoNameRe =
  /^(?:https?:\/\/)?(?:www\.)?(?:github|gitlab|bitbucket)\.com\/.*?\/(.+)?$/i;

function extractRepoName(repoUrl: string): string {
  const [, repoName] = repoNameRe.exec(repoUrl) ?? [];
  return repoName ? `repo: ${repoName}` : 'repo URL';
}
