import { ReadonlyJsonValue } from '../typesConstants';
import { StateSnapshotManager } from './StateSnapshotManager';

/**
 * Qualities I want to test for:
 * 1. Lets another system subscribe and unsubscribe to internal snapshot changes
 * 2. Will use a shallow-ish comparison algorithm if no custom method is provided
 * 3. Allows for a custom comparison algorithm to be defined during instantiation
 * 4. Rejects new snapshots that are equivalent to old ones, and does NOT notify subscriptions
 * 5. Will yield the current snapshot as a 100% immutable value when getSnapshot is called
 */
describe(`${StateSnapshotManager.name}`, () => {
  it('Lets external systems subscribe and unsubscribe to internal snapshot changes', () => {
    type SampleData = Readonly<{
      snapshotA: ReadonlyJsonValue;
      snapshotB: ReadonlyJsonValue;
    }>;

    const sampleData = [
      { snapshotA: false, snapshotB: true },
      { snapshotA: 'cat', snapshotB: 'dog' },
      { snapshotA: {}, snapshotB: { different: true } },
    ] as const satisfies readonly SampleData[];

    for (const { snapshotA, snapshotB } of sampleData) {
      const subscriptionCallback = jest.fn();
      const manager = new StateSnapshotManager({
        initialSnapshot: snapshotA,
      });

      const unsubscribe = manager.subscribe(subscriptionCallback);
      manager.updateSnapshot(snapshotB);
      expect(subscriptionCallback).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.updateSnapshot(snapshotA);
      expect(subscriptionCallback).toHaveBeenCalledTimes(1);
    }
  });
});
