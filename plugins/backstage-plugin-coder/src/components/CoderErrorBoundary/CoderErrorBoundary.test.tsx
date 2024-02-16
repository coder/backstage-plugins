import React, { type ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { CoderErrorBoundary } from './CoderErrorBoundary';
import { TestApiProvider } from '@backstage/test-utils';
import { errorApiRef } from '@backstage/core-plugin-api';
import { parse, string } from 'valibot';
import { suppressErrorBoundaryWarnings } from '../../testHelpers/setup';
import { getMockErrorApi } from '../../testHelpers/mockBackstageData';

beforeEach(() => {
  suppressErrorBoundaryWarnings();
});

const fallbackText = 'CoderErrorBoundary test - An error occurred';
const MockFallback = () => <p>{fallbackText}</p>;

const breakingMessage = 'Whoops';
const BrokenComponent = (): ReactElement => {
  throw new Error(breakingMessage);
};

const valibotErrorMessage = 'Valibot broke during parsing';
const BrokenValibotComponent = () => {
  const result = parse(string(valibotErrorMessage), {
    justAbsolutelyBlowUpImmediately: 'true/yes/affirmative',
  });

  return <p>This {result} should never render</p>;
};

function setupBoundaryTest(component: ReactElement) {
  const mockErrorApi = getMockErrorApi();

  expect(() => {
    render(
      <TestApiProvider apis={[[errorApiRef, mockErrorApi]]}>
        <CoderErrorBoundary fallbackUi={<MockFallback />}>
          {component}
        </CoderErrorBoundary>
      </TestApiProvider>,
    );
  }).not.toThrow();

  return mockErrorApi;
}

describe(`${CoderErrorBoundary.name}`, () => {
  it('Displays a fallback UI when a rendering error is encountered', () => {
    setupBoundaryTest(<BrokenComponent />);
    screen.getByText(fallbackText);
    expect.hasAssertions();
  });

  it('Exposes rendering errors to Backstage Error API', () => {
    const mockErrorApi = setupBoundaryTest(<BrokenComponent />);
    expect(mockErrorApi.post).toHaveBeenCalled();

    const renderingError = mockErrorApi
      .getErrors()
      .find(err => err instanceof Error && err.message === breakingMessage);

    expect(renderingError).not.toBeNull();
  });

  it('Is able to handle errors from failed Valibot parses', () => {
    const mockErrorApi = setupBoundaryTest(<BrokenValibotComponent />);
    expect(mockErrorApi.post).toHaveBeenCalled();

    const renderingError = mockErrorApi.getErrors().find(err => {
      return err instanceof Error && err.message.includes(valibotErrorMessage);
    });

    expect(renderingError).not.toBeNull();
  });
});
