import React, {
  type ButtonHTMLAttributes,
  type ForwardedRef,
  forwardRef,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useId } from '../../hooks/hookPolyfills';
import { useCoderAuth } from '../CoderProvider';
import { useWorkspacesCardContext } from './Root';
import { VisuallyHidden } from '../VisuallyHidden';

import Menu, { type MenuProps } from '@material-ui/core/Menu';
import { type MenuListProps } from '@material-ui/core/MenuList';
import MenuItem from '@material-ui/core/MenuItem';
import MoreItemsIcon from '@material-ui/icons/MoreVert';
import Tooltip, { type TooltipProps } from '@material-ui/core/Tooltip';
import { makeStyles } from '@material-ui/core';

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

    menuList: {
      '& > li:first-child:focus': {
        backgroundColor: theme.palette.action.hover,
      },
    },
  };
});

type ExtraActionsMenuProps = Readonly<
  Omit<
    MenuProps,
    | 'id'
    | 'open'
    | 'anchorEl'
    | 'MenuListProps'
    | 'children'
    | 'onClose'
    | 'getContentAnchorEl'
  > & {
    MenuListProps: Omit<MenuListProps, 'aria-labelledby' | 'aria-describedby'>;
  }
>;

type ExtraActionsButtonProps = Readonly<
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'id' | 'aria-controls'> & {
    onClose?: MenuProps['onClose'];
    menuProps?: ExtraActionsMenuProps;
    toolTipProps?: Omit<TooltipProps, 'children' | 'title'>;
    tooltipText?: string;
    tooltipRef?: ForwardedRef<unknown>;
  }
>;

export const ExtraActionsButton = forwardRef<
  HTMLButtonElement,
  ExtraActionsButtonProps
>((props, ref) => {
  const {
    menuProps,
    toolTipProps,
    tooltipRef,
    children,
    className,
    onClick: outerOnClick,
    onClose: outerOnClose,
    tooltipText = 'See additional workspace actions',
    ...delegatedButtonProps
  } = props;

  const {
    className: menuListClassName,
    ref: menuListRef,
    MenuListProps = {},
    ...delegatedMenuProps
  } = menuProps ?? {};

  const hookId = useId();
  const [loadedAnchor, setLoadedAnchor] = useState<HTMLButtonElement>();
  const refreshWorkspaces = useRefreshWorkspaces();
  const { ejectToken } = useCoderAuth();
  const styles = useStyles();

  const closeMenu = () => setLoadedAnchor(undefined);
  const isOpen = loadedAnchor !== undefined;
  const menuId = `${hookId}-menu`;
  const buttonId = `${hookId}-button`;
  const keyboardInstructionsId = `${hookId}-instructions`;

  return (
    <>
      <Tooltip ref={tooltipRef} title={tooltipText} {...toolTipProps}>
        <button
          ref={ref}
          id={buttonId}
          aria-controls={isOpen ? menuId : undefined}
          className={`${styles.root} ${className ?? ''}`}
          // type="button"
          onClick={event => {
            setLoadedAnchor(event.currentTarget);
            outerOnClick?.(event);
          }}
          {...delegatedButtonProps}
        >
          {children ?? <MoreItemsIcon />}
          <VisuallyHidden>{tooltipText}</VisuallyHidden>
        </button>
      </Tooltip>

      <p hidden id={keyboardInstructionsId}>
        Press the up and down arrow keys to navigate between list items. Press
        Escape to close the menu.
      </p>

      {/* Warning: all direct children of Menu must be MenuItem components, or
            else the auto-focus behavior will break. Even a custom component that
            returns out nothing but a MenuItem will break it. (Guessing that MUI
            uses something like cloneElement under the hood, and that they're
            interacting with the raw JSX metadata objects before they're turned
            into new UI.) */}
      <Menu
        // Necessary to set getContentAnchorEl to null in order to make sure
        // that anchorOrigin.vertical can be set. MUI will complain in the
        // console if both are defined, but MUI seems to set a default value
        // for the former
        getContentAnchorEl={null}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
        id={menuId}
        open={isOpen}
        anchorEl={loadedAnchor}
        MenuListProps={{
          variant: 'menu',
          autoFocusItem: true,
          dense: true,
          'aria-labelledby': buttonId,
          'aria-describedby': keyboardInstructionsId,
          className: `${styles.menuList} ${menuListClassName ?? ''}`,
          ...MenuListProps,
        }}
        onClose={(event, reason) => {
          closeMenu();
          outerOnClose?.(event, reason);
        }}
        {...delegatedMenuProps}
      >
        <MenuItem
          onClick={() => {
            refreshWorkspaces();
            closeMenu();
          }}
        >
          Refresh workspaces list
        </MenuItem>

        <MenuItem
          onClick={() => {
            ejectToken();
            closeMenu();
          }}
        >
          Eject token
        </MenuItem>
      </Menu>
    </>
  );
});

function useRefreshWorkspaces() {
  const { workspacesQuery } = useWorkspacesCardContext();
  const refreshThrottleIdRef = useRef<number | undefined>();

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

    workspacesQuery.refetch();
    refreshThrottleIdRef.current = window.setTimeout(() => {
      refreshThrottleIdRef.current = undefined;
    }, REFRESH_THROTTLE_MS);
  };

  return refreshWorkspaces;
}
