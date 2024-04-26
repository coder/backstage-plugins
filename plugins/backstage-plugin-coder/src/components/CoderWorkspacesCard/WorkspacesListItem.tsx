import React, {
  type KeyboardEvent,
  type LiHTMLAttributes,
  type MouseEvent,
  useRef,
} from 'react';

import { type Theme, makeStyles } from '@material-ui/core';
import { useId } from '../../hooks/hookPolyfills';

import { useCoderAppConfig } from '../CoderProvider';
import { getWorkspaceAgentStatuses } from '../../api/api';

import type { Workspace, WorkspaceStatus } from '../../typesConstants';
import { WorkspacesListIcon } from './WorkspacesListIcon';
import { VisuallyHidden } from '../VisuallyHidden';

type StyleKey =
  | 'root'
  | 'listFlexRow'
  | 'link'
  | 'onlineStatusContainer'
  | 'onlineStatusLight'
  | 'button';

type UseStyleInputs = Readonly<{
  isAvailable: boolean;
}>;

const useStyles = makeStyles<Theme, UseStyleInputs, StyleKey>(theme => ({
  root: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    columnGap: theme.spacing(2),
    margin: `0 -${theme.spacing(2)}px`,
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor: 'inherit',
    cursor: 'pointer',

    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },

    '&:first-child': {
      borderTop: 'none',
    },

    '&:last-child > div': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
  },

  listFlexRow: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    width: '100%',
    gap: theme.spacing(2),

    padding: `${theme.spacing(1)}px ${theme.spacing(2)}px ${theme.spacing(
      1,
    )}px ${theme.spacing(4)}px`,
  },

  link: {
    fontWeight: 500,
    color: theme.palette.type,
    fontSize: theme.typography.body1.fontSize,

    // All needed to make sure that long names get truncated properly
    display: 'block',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },

  onlineStatusContainer: {
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: '16px',
  },

  onlineStatusLight: ({ isAvailable }) => ({
    display: 'block',
    width: theme.spacing(1),
    height: theme.spacing(1),
    borderRadius: '9999px',
    borderWidth: '1px',
    borderStyle: 'solid',

    // Border color helps increase color contrast in light mode
    borderColor: isAvailable
      ? 'hsl(130deg,100%,40%)'
      : theme.palette.common.black,
    backgroundColor: isAvailable
      ? 'hsl(135deg,100%,77%)'
      : theme.palette.common.black,
  }),

  button: {
    border: `1px solid ${theme.palette.primary.main}`,
    textTransform: 'uppercase',
    borderRadius: theme.shape.borderRadius,
    padding: `${theme.spacing(1)}px ${theme.spacing(2.5)}px`,
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: theme.palette.primary.main,
    backgroundColor: 'inherit',
    flexShrink: 0,

    '&:hover': {
      backgroundColor: theme.palette.background.default,
    },
  },
}));

type StyleKeyClassName = `${Exclude<StyleKey, 'root'>}ClassName`;

type Props = Readonly<
  Omit<LiHTMLAttributes<HTMLLIElement>, 'children'> &
    Partial<Record<StyleKeyClassName, string>> & {
      workspace: Workspace;
    }
>;

export const WorkspacesListItem = ({
  workspace,
  className,
  listFlexRowClassName,
  linkClassName,
  onlineStatusContainerClassName,
  onlineStatusLightClassName,
  buttonClassName,
  onClick: outerOnClick,
  onAuxClick: outerOnAuxClick,
  onKeyDown: outerOnKeyDown,
  ...delegatedProps
}: Props) => {
  const hookId = useId();
  const { accessUrl } = useCoderAppConfig().deployment;
  const anchorElementRef = useRef<HTMLAnchorElement>(null);

  const availabilityStatus = getAvailabilityStatus(workspace);
  const styles = useStyles({
    isAvailable:
      availabilityStatus === 'online' || availabilityStatus === 'pending',
  });

  const { name, owner_name, template_icon } = workspace;
  const onlineStatusId = `${hookId}-online-status`;
  const clickAnchor = () => anchorElementRef.current?.click();

  return (
    /* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions --
       Adding event listeners to the list item to increase clickable link area
       for users. Events will always get "re-routed" to the anchor
    */
    <li
      className={`${styles.root} ${className ?? ''}`}
      onClick={event => {
        clickAnchor();
        outerOnClick?.(event);
      }}
      onAuxClick={event => {
        clickAnchor();
        outerOnAuxClick?.(event);
      }}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          clickAnchor();
        }
        outerOnKeyDown?.(event);
      }}
      {...delegatedProps}
    >
      <div className={`${styles.listFlexRow} ${listFlexRowClassName ?? ''}`}>
        <WorkspacesListIcon src={template_icon} workspaceName={name} />

        <div style={{ flexGrow: 1, minWidth: 0 }}>
          <a
            ref={anchorElementRef}
            className={`${styles.link} ${linkClassName ?? ''}`}
            href={`${accessUrl}/@${owner_name}/${name}`}
            target="_blank"
            aria-describedby={onlineStatusId}
            // Needed to avoid infinite event loops from the list item routing
            // events back to the anchor
            onClick={stopClickEventBubbling}
          >
            <VisuallyHidden>Open workspace for </VisuallyHidden>
            {name}
            <VisuallyHidden> in Coder. (Link opens in new tab.)</VisuallyHidden>
          </a>

          <span
            id={onlineStatusId}
            className={`${styles.onlineStatusContainer} ${
              onlineStatusContainerClassName ?? ''
            }`}
          >
            <span
              role="none"
              className={`${styles.onlineStatusLight} ${
                onlineStatusLightClassName ?? ''
              }`}
            />

            <VisuallyHidden>Workspace is </VisuallyHidden>
            {availabilityStatus === 'deleting' ||
            availabilityStatus === 'pending' ? (
              <>{toUppercase(availabilityStatus)}&hellip;</>
            ) : (
              <>
                {toUppercase(availabilityStatus)}
                <VisuallyHidden>.</VisuallyHidden>
              </>
            )}
          </span>
        </div>

        {/*
         * Button is purely decorative, because the whole list item basically
         * functions as one giant link. The span is just here to make it more
         * clear that something should be clicked on
         */}
        <span
          aria-hidden
          className={`${styles.button} ${buttonClassName ?? ''}`}
        >
          Open
        </span>
      </div>
    </li>
  );
};

const deletingStatuses: readonly WorkspaceStatus[] = ['deleting', 'deleted'];
const offlineStatuses: readonly WorkspaceStatus[] = [
  'stopped',
  'stopping',
  'pending',
  'canceling',
  'canceled',
];

type AvailabilityStatus =
  | 'online'
  | 'offline'
  | 'pending'
  | 'failed'
  | 'deleting';

function getAvailabilityStatus(workspace: Workspace): AvailabilityStatus {
  const currentStatus = workspace.latest_build.status;

  if (currentStatus === 'failed') {
    return 'failed';
  }

  // When a workspace is being deleted, there is a good chance that the agents
  // will still show as connected/connecting. If this check isn't done before
  // looking at the agent statuses, a deleting workspace might show up as online
  if (deletingStatuses.includes(currentStatus)) {
    return 'deleting';
  }

  if (offlineStatuses.includes(currentStatus)) {
    return 'offline';
  }

  const uniqueStatuses = getWorkspaceAgentStatuses(workspace);
  const isPending =
    currentStatus === 'starting' ||
    uniqueStatuses.some(status => status === 'connecting');

  if (isPending) {
    return 'pending';
  }

  // .every will still make workspaces with no agents show as online
  return uniqueStatuses.every(status => status === 'connected')
    ? 'online'
    : 'offline';
}

function stopClickEventBubbling(event: MouseEvent | KeyboardEvent): void {
  const { nativeEvent } = event;
  const shouldStopBubbling =
    nativeEvent instanceof MouseEvent ||
    (nativeEvent instanceof KeyboardEvent && nativeEvent.key === 'Enter');

  if (shouldStopBubbling) {
    event.stopPropagation();
  }
}

function toUppercase(s: string): string {
  return s.slice(0, 1).toUpperCase() + s.slice(1).toLowerCase();
}
