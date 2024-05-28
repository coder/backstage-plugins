import { useCoderQuery } from './reactQueryWrappers';

describe(`${useCoderQuery.name}`, () => {
  it('Does not let requests go through until the user is authenticated', async () => {
    expect.hasAssertions();
  });

  it('Never retries requests if the user is not authenticated', () => {
    expect.hasAssertions();
  });

  it('Never displays previous data for changing query keys if the user is not authenticated', () => {
    expect.hasAssertions();
  });

  it('Automatically prefixes all query keys with the global Coder query key prefix', () => {
    expect.hasAssertions();
  });

  it('Disables all refetch-based properties when the user is not authenticated', () => {
    expect.hasAssertions();
  });

  it('Behaves exactly like useQuery if the user is fully authenticated (aside from queryKey patching)', () => {
    expect.hasAssertions();
  });
});
