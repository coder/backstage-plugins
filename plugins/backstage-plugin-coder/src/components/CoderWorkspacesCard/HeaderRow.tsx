import React, { HTMLAttributes, ReactNode } from 'react';
import { type Theme, makeStyles } from '@material-ui/core';
import { useWorkspacesCardContext } from './Root';
import type { HtmlHeader } from '../../typesConstants';

type StyleKey = 'root' | 'header' | 'hgroup' | 'subheader';
const useStyles = makeStyles<Theme, {}, StyleKey>(theme => ({
  root: {
    color: theme.palette.text.primary,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    gap: theme.spacing(1),
  },

  hgroup: {
    marginRight: 'auto',
  },

  header: {
    // Want the header text to be set solid (typography term for setting line
    // height equal to font size) to reduce gaps between it and the subtitle,
    // but only MUI's h3 line height is the smallest value/closest match
    lineHeight: theme.typography.h3.lineHeight ?? 1,
    fontSize: theme.typography.h5.fontSize ?? '1.5rem',
    margin: 0,
  },

  subheader: {
    margin: '0',
    fontSize: theme.typography.subtitle2.fontSize ?? '0.875rem',
    fontWeight: 400,
    color: theme.palette.text.secondary,
    paddingTop: theme.spacing(0.5),
  },
}));

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
  ...delegatedProps
}: HeaderProps) => {
  const { headerId, workspacesConfig } = useWorkspacesCardContext();
  const styles = useStyles();

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
