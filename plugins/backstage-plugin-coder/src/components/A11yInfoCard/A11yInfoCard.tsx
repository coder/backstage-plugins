/**
 * @file A slightly different take on Backstage's official InfoCard component,
 * with better support for accessibility.
 *
 * Does not support all of InfoCard's properties just yet.
 */
import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { makeStyles } from '@material-ui/core';
import { scaleCssUnit } from '../../utils/styling';

export type A11yInfoCardProps = Readonly<
  HTMLAttributes<HTMLDivElement> & {
    headerContent?: ReactNode;
  }
>;

const useStyles = makeStyles(theme => ({
  root: {
    color: theme.palette.type,
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
  },

  headerContent: {
    fontSize: scaleCssUnit(theme.typography.body1.fontSize, 1.5),
    color: theme.palette.text.primary,
    fontWeight: 700,
    borderBottom: `1px solid ${theme.palette.divider}`,

    // Margins and padding are a bit wonky to support full-bleed layouts
    marginLeft: `-${theme.spacing(2)}px`,
    marginRight: `-${theme.spacing(2)}px`,
    padding: `0 ${theme.spacing(2)}px ${theme.spacing(2)}px`,
  },
}));

// Card should be treated as equivalent to Backstage's official InfoCard
// component; had to make custom version so that it could forward properties for
// accessibility/screen reader support
export const A11yInfoCard = forwardRef<HTMLDivElement, A11yInfoCardProps>(
  (props, ref) => {
    const { className, children, headerContent, ...delegatedProps } = props;
    const styles = useStyles();

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
