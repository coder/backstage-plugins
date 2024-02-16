import React, {
  type ButtonHTMLAttributes,
  type ForwardedRef,
  forwardRef,
  useEffect,
  useRef,
} from 'react';
import { makeStyles } from '@material-ui/core';

import { useWorkspacesCardContext } from './Root';
import { VisuallyHidden } from '../VisuallyHidden';

import Tooltip, { type TooltipProps } from '@material-ui/core/Tooltip';
import RefreshIcon from '@material-ui/icons/Cached';

const REFRESH_THROTTLE_MS = 1_000;

const useStyles = makeStyles(theme => {
  const padding = theme.spacing(0.5);

  return {
    root: {
      padding,
      margin: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      color: theme.palette.text.primary,
      width: theme.spacing(4) + padding,
      height: theme.spacing(4) + padding,
      border: 'none',
      borderRadius: '9999px',
      backgroundColor: 'inherit',
      lineHeight: 1,

      // Buttons don't traditionally have the pointer style, but it's being
      // changed to match the cursor style for CreateWorkspaceButtonLink
      cursor: 'pointer',

      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
    },
  };
});

type RefreshButtonProps = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    tooltipText?: string;
    toolTipProps?: Omit<TooltipProps, 'children' | 'title'>;
    tooltipRef?: ForwardedRef<unknown>;
  }
>;

export const RefreshButton = forwardRef(
  (props: RefreshButtonProps, ref?: ForwardedRef<HTMLButtonElement>) => {
    const {
      children,
      className,
      tooltipRef,
      onClick: outerOnClick,
      toolTipProps = {},
      type = 'button',
      tooltipText = 'Refresh workspaces list',
      ...delegatedProps
    } = props;

    const { workspacesQuery } = useWorkspacesCardContext();
    const refreshThrottleIdRef = useRef<number | undefined>();
    const styles = useStyles();

    useEffect(() => {
      const clearThrottleOnUnmount = () => {
        window.clearTimeout(refreshThrottleIdRef.current);
      };

      return clearThrottleOnUnmount;
    }, []);

    const refreshWorkspaces = () => {
      if (refreshThrottleIdRef.current !== undefined) {
        return;
      }

      refreshThrottleIdRef.current = window.setTimeout(() => {
        workspacesQuery.refetch();
        refreshThrottleIdRef.current = undefined;
      }, REFRESH_THROTTLE_MS);
    };

    return (
      <Tooltip ref={tooltipRef} title={tooltipText} {...toolTipProps}>
        <button
          ref={ref}
          type={type}
          className={`${styles.root} ${className ?? ''}`}
          onClick={event => {
            refreshWorkspaces();
            outerOnClick?.(event);
          }}
          {...delegatedProps}
        >
          {children ?? <RefreshIcon />}
          <VisuallyHidden>{tooltipText}</VisuallyHidden>
        </button>
      </Tooltip>
    );
  },
);
