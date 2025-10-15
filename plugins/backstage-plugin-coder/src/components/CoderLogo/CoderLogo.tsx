import { makeStyles } from '@material-ui/core';
import React, { type HTMLAttributes } from 'react';

type CoderLogoProps = Readonly<
  Omit<HTMLAttributes<HTMLOrSVGElement>, 'children'>
>;

const useStyles = makeStyles(theme => ({
  root: {
    fill: theme.palette.text.primary,
    opacity: 1,
  },
}));

export const CoderLogo = ({
  className = '',
  ...delegatedProps
}: CoderLogoProps) => {
  const styles = useStyles();
  return (
    <svg
      aria-hidden
      width="40"
      height="20"
      className={`${styles.root} ${className}`}
      viewBox="0 0 426 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...delegatedProps}
    >
      <g clipPath="url(#clip0_1_3)">
        <path d="M425.93 5.41H263.75V194.65H425.93V5.41Z" fill="currentColor" />
        <path
          d="M0 100C0 38.92 51.89 0 123.25 0C194.61 0 234.6 33.78 235.95 83.51L174.33 85.4C172.71 57.83 148.3 39.72 123.25 40.26C88.93 41 63.52 63.77 63.52 99.99C63.52 136.21 88.93 158.64 123.25 158.64C148.3 158.64 172.16 141.34 174.87 113.78L236.49 115.13C234.87 165.67 192.44 200 123.25 200C54.06 200 0 160.81 0 100Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
};
