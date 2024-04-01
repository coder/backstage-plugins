import React, { type AnchorHTMLAttributes, type ForwardedRef } from 'react';
import { type Theme, makeStyles } from '@material-ui/core';
import { useWorkspacesCardContext } from './Root';

import { VisuallyHidden } from '../VisuallyHidden';
import AddIcon from '@material-ui/icons/AddCircleOutline';
import Tooltip, { type TooltipProps } from '@material-ui/core/Tooltip';

type StyleInput = Readonly<{
  canCreateWorkspace: boolean;
}>;

type StyleKeys = 'root';
const useStyles = makeStyles<Theme, StyleInput, StyleKeys>(theme => {
  const padding = theme.spacing(0.5);

  return {
    root: ({ canCreateWorkspace }) => ({
      padding,
      width: theme.spacing(4) + padding,
      height: theme.spacing(4) + padding,
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'inherit',
      borderRadius: '9999px',
      lineHeight: 1,
      color: canCreateWorkspace
        ? theme.palette.text.primary
        : theme.palette.text.disabled,

      '&:hover': {
        backgroundColor: canCreateWorkspace
          ? theme.palette.action.hover
          : 'inherit',
      },
    }),
  };
});

type CreateButtonLinkProps = Readonly<
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'aria-disabled'> & {
    tooltipText?: string;
    tooltipProps?: Omit<TooltipProps, 'children' | 'title'>;
    tooltipRef?: ForwardedRef<unknown>;
  }
>;

export const CreateWorkspaceLink = ({
  children,
  className,
  tooltipRef,
  target = '_blank',
  tooltipText = 'Add a new workspace',
  tooltipProps = {},
  ...delegatedProps
}: CreateButtonLinkProps) => {
  const { workspacesConfig } = useWorkspacesCardContext();
  const canCreateWorkspace = Boolean(workspacesConfig.creationUrl);
  const styles = useStyles({ canCreateWorkspace });

  return (
    <Tooltip
      ref={tooltipRef}
      title={
        canCreateWorkspace ? tooltipText : 'Please add a template name value'
      }
      {...tooltipProps}
    >
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles --
          Some browsers will render out <a> elements as having no role when the
          href value is undefined or an empty string. Need to make sure that the
          link role is always defined, no matter what. The ESLint rule is wrong
          here. */}
      <a
        role="link"
        target={target}
        className={`${styles.root} ${className ?? ''}`}
        /**
         * Also need to make sure that the link is correctly disabled when there
         * is no href available.
         * @see {@link https://www.scottohara.me/blog/2021/05/28/disabled-links.html}
         */
        href={workspacesConfig.creationUrl}
        aria-disabled={!canCreateWorkspace}
        {...delegatedProps}
      >
        {children ?? <AddIcon />}

        <VisuallyHidden>
          {canCreateWorkspace ? (
            <>
              {tooltipText}
              {target === '_blank' && <> (Link opens in new tab)</>}
            </>
          ) : (
            <>
              This component does not have a usable template name. Please see
              the disclosure section in this widget for steps on adding this
              information.
            </>
          )}
        </VisuallyHidden>
      </a>
    </Tooltip>
  );
};
