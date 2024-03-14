import React, { type AnchorHTMLAttributes, type ForwardedRef } from 'react';
import { makeStyles } from '@material-ui/core';
import { useWorkspacesCardContext } from './Root';

import { VisuallyHidden } from '../VisuallyHidden';
import AddIcon from '@material-ui/icons/AddCircleOutline';
import Tooltip, { type TooltipProps } from '@material-ui/core/Tooltip';

const useStyles = makeStyles(theme => {
  const padding = theme.spacing(0.5);

  return {
    root: {
      padding,
      width: theme.spacing(4) + padding,
      height: theme.spacing(4) + padding,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'inherit',
      borderRadius: '9999px',
      lineHeight: 1,

      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
    },
  };
});

type CreateButtonLinkProps = Readonly<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
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
  const styles = useStyles();
  const { workspaceCreationLink } = useWorkspacesCardContext();

  return (
    <Tooltip ref={tooltipRef} title={tooltipText} {...tooltipProps}>
      <a
        target={target}
        className={`${styles.root} ${className ?? ''}`}
        href={workspaceCreationLink}
        {...delegatedProps}
      >
        {children ?? <AddIcon />}

        <VisuallyHidden>
          {tooltipText}
          {target === '_blank' && <> (Link opens in new tab)</>}
        </VisuallyHidden>
      </a>
    </Tooltip>
  );
};
