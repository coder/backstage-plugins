import React, {
  type ChangeEvent,
  type FieldsetHTMLAttributes,
  type ForwardedRef,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useId } from '../../hooks/hookPolyfills';
import { VisuallyHidden } from '../VisuallyHidden';
import { Theme, makeStyles } from '@material-ui/core';

import { useWorkspacesCardContext } from './Root';
import SearchIcon from '@material-ui/icons/Search';
import CloseIcon from '@material-ui/icons/Close';

const LABEL_TEXT = 'Search your Coder workspaces';
const SEARCH_DEBOUNCE_MS = 400;

type MakeStylesInput = Readonly<{
  isInputEmpty: boolean;
}>;

type StyleKey = 'root' | 'labelWrapper' | 'clearButton' | 'searchInput';

const useStyles = makeStyles<Theme, MakeStylesInput, StyleKey>(theme => ({
  root: {
    padding: 0,
    margin: 0,
    border: 'none',
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    borderRadius: theme.shape.borderRadius,
    boxShadow: 'none',

    // There's a weird styling issue where Spotify's default background colors
    // don't have the same amount of contrast across their built-in light and
    // dark themes. It's just right for the input in dark mode, but too faint in
    // light mode. Have to make it darker to make sure input is more obvious
    backgroundColor: () => {
      const defaultBackgroundColor = theme.palette.background.default;
      const isDefaultSpotifyLightTheme =
        defaultBackgroundColor.toUpperCase() === '#F8F8F8';

      return isDefaultSpotifyLightTheme
        ? 'hsl(0deg,0%,93%)'
        : defaultBackgroundColor;
    },

    '&:focus-within': {
      boxShadow: '0 0 0 1px hsl(213deg, 94%, 68%)',
    },

    // Makes it so that the container doesn't have visible focus while you're
    // focusing on the clear button
    '&:has(button:focus)': {
      boxShadow: 'none',
    },
  },

  labelWrapper: {
    flexGrow: 1,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    padding: `${theme.spacing(1.5)}px ${theme.spacing(2)}px`,
  },

  searchInput: {
    color: 'inherit',
    display: 'block',
    height: '100%',
    width: '100%',
    backgroundColor: 'inherit',
    border: 'none',
    fontSize: theme.typography.body1.fontSize,
    outline: 'none',
  },

  clearButton: ({ isInputEmpty }) => ({
    padding: `${theme.spacing(1.5)}px ${theme.spacing(2)}px`,
    margin: 0,
    lineHeight: 1,
    backgroundColor: 'inherit',
    border: 'none',
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.text.primary,
    opacity: isInputEmpty ? '40%' : '100%',
    outline: 'none',
    cursor: 'pointer',

    '&:focus': {
      boxShadow: '0 0 0 1px hsl(213deg, 94%, 68%)',
    },
  }),
}));

type PropClassNameKeys = `${Exclude<StyleKey, 'root'>}ClassName`;

type Props = Readonly<
  Omit<
    FieldsetHTMLAttributes<HTMLFieldSetElement>,
    'children' | 'aria-labelledby'
  > &
    Partial<Record<PropClassNameKeys, string>> & {
      searchInputRef?: ForwardedRef<HTMLInputElement>;
      clearButtonRef?: ForwardedRef<HTMLButtonElement>;
    }
>;

export const SearchBox = ({
  className,
  labelWrapperClassName,
  searchInputClassName,
  clearButtonClassName,
  searchInputRef,
  clearButtonRef,
  ...delegatedProps
}: Props) => {
  const hookId = useId();
  const { queryFilter, onFilterChange } = useWorkspacesCardContext();
  const [localInput, setLocalInput] = useState(queryFilter);

  const isInputEmpty = localInput === '';
  const styles = useStyles({ isInputEmpty });

  const searchDebounceIdRef = useRef<number | undefined>();
  useEffect(() => {
    const clearDebounceOnUnmount = () => {
      window.clearTimeout(searchDebounceIdRef.current);
    };

    return clearDebounceOnUnmount;
  }, []);

  const onSearchClear = () => {
    setLocalInput('');
    onFilterChange('');
    window.clearTimeout(searchDebounceIdRef.current);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newSearchText = event.currentTarget.value;
    setLocalInput(newSearchText);

    const textClearedViaInput = !isInputEmpty && newSearchText === '';
    if (textClearedViaInput) {
      onSearchClear();
      return;
    }

    window.clearTimeout(searchDebounceIdRef.current);
    searchDebounceIdRef.current = window.setTimeout(() => {
      onFilterChange(newSearchText);
    }, SEARCH_DEBOUNCE_MS);
  };

  const legendId = `${hookId}-legend`;

  return (
    // Have to use aria-labelledby even though <legend>s normally provide
    // accessible names automatically - the hidden prop on the legend blocks the
    // default behavior
    <fieldset
      aria-labelledby={legendId}
      className={`${styles.root} ${className ?? ''}`}
      {...delegatedProps}
    >
      <legend hidden id={legendId}>
        Search controls
      </legend>

      <label
        className={`${styles.labelWrapper} ${labelWrapperClassName ?? ''}`}
      >
        <SearchIcon aria-hidden fontSize="small" htmlColor="#7b7b7b" />
        <VisuallyHidden>{LABEL_TEXT}</VisuallyHidden>

        <input
          ref={searchInputRef}
          // Not using type "search" because we're using a custom clear button
          type="text"
          role="searchbox"
          spellCheck
          placeholder={LABEL_TEXT}
          value={localInput}
          onChange={onChange}
          className={`${styles.searchInput} ${searchInputClassName ?? ''}`}
        />
      </label>

      <button
        type="button"
        ref={clearButtonRef}
        onClick={onSearchClear}
        disabled={isInputEmpty}
        className={`${styles.clearButton} ${clearButtonClassName ?? ''}`}
      >
        <CloseIcon fontSize="small" />
        <VisuallyHidden>Clear out search</VisuallyHidden>
      </button>
    </fieldset>
  );
};
