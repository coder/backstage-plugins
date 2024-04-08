import type { ReadonlyJsonValue } from '../typesConstants';
import {
  StateSnapshotManager,
  defaultDidSnapshotsChange,
} from './StateSnapshotManager';

describe(`${StateSnapshotManager.name}`, () => {
  it('Lets external systems subscribe and unsubscribe to internal snapshot changes', () => {
    type SampleData = Readonly<{
      snapshotA: ReadonlyJsonValue;
      snapshotB: ReadonlyJsonValue;
    }>;

    const sampleData = [
      { snapshotA: false, snapshotB: true },
      { snapshotA: 0, snapshotB: 1 },
      { snapshotA: 'cat', snapshotB: 'dog' },
      { snapshotA: null, snapshotB: 'neat' },
      { snapshotA: {}, snapshotB: { different: true } },
      { snapshotA: [], snapshotB: ['I have a value now!'] },
    ] as const satisfies readonly SampleData[];

    for (const { snapshotA, snapshotB } of sampleData) {
      const subscriptionCallback = jest.fn();
      const manager = new StateSnapshotManager({
        initialSnapshot: snapshotA,
        didSnapshotsChange: defaultDidSnapshotsChange,
      });

      const unsubscribe = manager.subscribe(subscriptionCallback);
      manager.updateSnapshot(snapshotB);
      expect(subscriptionCallback).toHaveBeenCalledTimes(1);
      expect(subscriptionCallback).toHaveBeenCalledWith(snapshotB);

      unsubscribe();
      manager.updateSnapshot(snapshotA);
      expect(subscriptionCallback).toHaveBeenCalledTimes(1);
    }
  });

  it('Lets user define custom comparison algorithm during instantiation', () => {
    type SampleData = Readonly<{
      snapshotA: ReadonlyJsonValue;
      snapshotB: ReadonlyJsonValue;
      compare: (A: ReadonlyJsonValue, B: ReadonlyJsonValue) => boolean;
    }>;

    const exampleDeeplyNestedJson: ReadonlyJsonValue = {
      value1: {
        value2: {
          value3: {
            value4: [{ valueX: true }, { valueY: false }],
          },
        },
      },
    };

    const sampleData = [
      {
        snapshotA: exampleDeeplyNestedJson,
        snapshotB: JSON.parse(JSON.stringify(exampleDeeplyNestedJson)),
        compare: (A, B) => JSON.stringify(A) === JSON.stringify(B),
      },
      {
        snapshotA: { tag: 'snapshot', value: 1 },
        snapshotB: { tag: 'snapshot', value: 9999 },
        compare: (A, B) => {
          const recastA = A as Record<string, unknown>;
          const recastB = B as Record<string, unknown>;
          return recastA.tag === recastB.tag;
        },
      },
    ] as const satisfies readonly SampleData[];

    for (const { snapshotA, snapshotB, compare } of sampleData) {
      const subscriptionCallback = jest.fn();
      const manager = new StateSnapshotManager({
        initialSnapshot: snapshotA,
        didSnapshotsChange: compare,
      });

      void manager.subscribe(subscriptionCallback);
      manager.updateSnapshot(snapshotB);
      expect(subscriptionCallback).toHaveBeenCalledWith(snapshotB);
    }
  });

  it('Rejects new snapshots that are equivalent to old ones, and does NOT notify subscriptions', () => {
    type SampleData = Readonly<{
      snapshotA: ReadonlyJsonValue;
      snapshotB: ReadonlyJsonValue;
    }>;

    const sampleData = [
      { snapshotA: true, snapshotB: true },
      { snapshotA: 'kitty', snapshotB: 'kitty' },
      { snapshotA: null, snapshotB: null },
      { snapshotA: [], snapshotB: [] },
      { snapshotA: {}, snapshotB: {} },
    ] as const satisfies readonly SampleData[];

    for (const { snapshotA, snapshotB } of sampleData) {
      const subscriptionCallback = jest.fn();
      const manager = new StateSnapshotManager({
        initialSnapshot: snapshotA,
        didSnapshotsChange: defaultDidSnapshotsChange,
      });

      void manager.subscribe(subscriptionCallback);
      manager.updateSnapshot(snapshotB);
      expect(subscriptionCallback).not.toHaveBeenCalled();
    }
  });
});

describe(`${defaultDidSnapshotsChange.name}`, () => {});
