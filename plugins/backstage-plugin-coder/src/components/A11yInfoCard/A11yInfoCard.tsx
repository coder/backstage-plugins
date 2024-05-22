/**
 * @file A slightly different take on Backstage's official InfoCard component,
 * with better support for accessibility.
 */
import React, { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { makeStyles } from '@material-ui/core';

export type A11yInfoCardProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    headerContent?: ReactNode;
  }
>;

const useCardStyles = makeStyles(theme => ({
  root: {
    color: theme.palette.type,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },

  headerContent: {},
}));

// Card should be treated as equivalent to Backstage's official InfoCard
// component; had to make custom version so that it could forward properties for
// accessibility/screen reader support
export const A11yInfoCard = forwardRef<HTMLDivElement, A11yInfoCardProps>(
  (props, ref) => {
    const { className, children, headerContent, ...delegatedProps } = props;
    const styles = useCardStyles();

    return (
      <div
        ref={ref}
        className={`${styles.root} ${className ?? ''}`}
        {...delegatedProps}
      >
        {headerContent !== undefined && (
          <div className={styles.headerContent}>{headerContent}</div>
        )}

        {children}
      </div>
    );
  },
);
