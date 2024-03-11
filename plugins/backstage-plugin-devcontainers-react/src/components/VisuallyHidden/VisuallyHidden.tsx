/**
 * @file A slightly modified version of Josh Comeau's VisuallyHidden component,
 * with some changes made for better TypeScript support and to make code fit
 * Backstage style guides.
 *
 * @see {@link https://www.joshwcomeau.com/snippets/react-components/visually-hidden/}
 */
import React, {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useState,
} from 'react';

const visuallyHiddenStyles: CSSProperties = {
  display: 'inline-block',
  position: 'absolute',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  height: 1,
  width: 1,
  margin: -1,
  padding: 0,
  border: 0,
};

type VisuallyHiddenProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export const VisuallyHidden = ({
  children,
  ...delegatedProps
}: VisuallyHiddenProps) => {
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return undefined;
    }

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Alt') {
        setForceShow(true);
      }
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if (ev.key === 'Alt') {
        setForceShow(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return forceShow ? (
    <>{children}</>
  ) : (
    <span style={visuallyHiddenStyles} {...delegatedProps}>
      {children}
    </span>
  );
};
