import type { ReadonlyJsonValue } from '../typesConstants';
import {
  StateSnapshotManager,
  defaultDidSnapshotsChange,
} from './StateSnapshotManager';

describe(`${defaultDidSnapshotsChange.name}`, () => {
  type SampleInput = Readonly<{
    snapshotA: ReadonlyJsonValue;
    snapshotB: ReadonlyJsonValue;
  }>;

  it('Will detect when two JSON primitives are the same', () => {
    const samples = [
      { snapshotA: true, snapshotB: true },
      { snapshotA: 'cat', snapshotB: 'cat' },
      { snapshotA: 2, snapshotB: 2 },
      { snapshotA: null, snapshotB: null },
    ] as const satisfies readonly SampleInput[];

    for (const { snapshotA, snapshotB } of samples) {
      expect(defaultDidSnapshotsChange(snapshotA, snapshotB)).toBe(false);
    }
  });

  it('Will detect when two JSON primitives are different', () => {
    const samples = [
      { snapshotA: true, snapshotB: false },
      { snapshotA: 'cat', snapshotB: 'dog' },
      { snapshotA: 2, snapshotB: 789 },
      { snapshotA: null, snapshotB: 'blah' },
    ] as const satisfies readonly SampleInput[];

    for (const { snapshotA, snapshotB } of samples) {
      expect(defaultDidSnapshotsChange(snapshotA, snapshotB)).toBe(true);
    }
  });

  it('Will detect when a value flips from a primitive to an object (or vice versa)', () => {
    expect(defaultDidSnapshotsChange(null, {})).toBe(true);
    expect(defaultDidSnapshotsChange({}, null)).toBe(true);
  });

  it('Will reject numbers that changed by a very small floating-point epsilon', () => {
    expect(defaultDidSnapshotsChange(3, 3 / 1.00000001)).toBe(false);
  });

  it('Will check array values one level deep', () => {
    const snapshotA = [1, 2, 3];

    const snapshotB = [...snapshotA];
    expect(defaultDidSnapshotsChange(snapshotA, snapshotB)).toBe(false);

    const snapshotC = [...snapshotA, 4];
    expect(defaultDidSnapshotsChange(snapshotA, snapshotC)).toBe(true);

    const snapshotD = [...snapshotA, {}];
    expect(defaultDidSnapshotsChange(snapshotA, snapshotD)).toBe(true);
  });

  it('Will check object values one level deep', () => {
    const snapshotA = { cat: true, dog: true };

    const snapshotB = { ...snapshotA, dog: true };
    expect(defaultDidSnapshotsChange(snapshotA, snapshotB)).toBe(false);

    const snapshotC = { ...snapshotA, bird: true };
    expect(defaultDidSnapshotsChange(snapshotA, snapshotC)).toBe(true);

    const snapshotD = { ...snapshotA, value: {} };
    expect(defaultDidSnapshotsChange(snapshotA, snapshotD)).toBe(true);
  });
});

describe(`${StateSnapshotManager.name}`, () => {
  it('Lets external systems subscribe and unsubscribe to internal snapshot changes', () => {
    type SampleData = Readonly<{
      snapshotA: ReadonlyJsonValue;
      snapshotB: ReadonlyJsonValue;
    }>;

    const samples = [
      { snapshotA: false, snapshotB: true },
      { snapshotA: 0, snapshotB: 1 },
      { snapshotA: 'cat', snapshotB: 'dog' },
      { snapshotA: null, snapshotB: 'neat' },
      { snapshotA: {}, snapshotB: { different: true } },
      { snapshotA: [], snapshotB: ['I have a value now!'] },
    ] as const satisfies readonly SampleData[];

    for (const { snapshotA, snapshotB } of samples) {
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

  it('Lets user define a custom comparison algorithm during instantiation', () => {
    type SampleData = Readonly<{
      snapshotA: ReadonlyJsonValue;
      snapshotB: ReadonlyJsonValue;
      compare: (A: ReadonlyJsonValue, B: ReadonlyJsonValue) => boolean;
    }>;

    const exampleDeeplyNestedJson: ReadonlyJsonValue = {
      value1: {
        value2: {
          value3: 'neat',
        },
      },

      value4: {
        value5: [{ valueX: true }, { valueY: false }],
      },
    };

    const samples = [
      {
        snapshotA: exampleDeeplyNestedJson,
        snapshotB: {
          ...exampleDeeplyNestedJson,
          value4: {
            value5: [{ valueX: false }, { valueY: false }],
          },
        },
        compare: (A, B) => JSON.stringify(A) !== JSON.stringify(B),
      },
      {
        snapshotA: { tag: 'snapshot-993', value: 1 },
        snapshotB: { tag: 'snapshot-2004', value: 1 },
        compare: (A, B) => {
          const recastA = A as Record<string, unknown>;
          const recastB = B as Record<string, unknown>;
          return recastA.tag !== recastB.tag;
        },
      },
    ] as const satisfies readonly SampleData[];

    for (const { snapshotA, snapshotB, compare } of samples) {
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

  it('Rejects new snapshots that are equivalent to old ones, and does NOT notify subscribers', () => {
    type SampleData = Readonly<{
      snapshotA: ReadonlyJsonValue;
      snapshotB: ReadonlyJsonValue;
    }>;

    const samples = [
      { snapshotA: true, snapshotB: true },
      { snapshotA: 'kitty', snapshotB: 'kitty' },
      { snapshotA: null, snapshotB: null },
      { snapshotA: [], snapshotB: [] },
      { snapshotA: {}, snapshotB: {} },
    ] as const satisfies readonly SampleData[];

    for (const { snapshotA, snapshotB } of samples) {
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

  it("Uses the default comparison algorithm if one isn't specified at instantiation", () => {
    const snapshotA = { value: 'blah' };
    const snapshotB = { value: 'blah' };

    const manager = new StateSnapshotManager({
      initialSnapshot: snapshotA,
    });

    const subscriptionCallback = jest.fn();
    void manager.subscribe(subscriptionCallback);
    manager.updateSnapshot(snapshotB);

    expect(subscriptionCallback).not.toHaveBeenCalled();
  });
});
