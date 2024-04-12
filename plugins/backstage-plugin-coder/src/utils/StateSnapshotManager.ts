/**
 * @file A helper class that simplifies the process of connecting mutable class
 * values (such as the majority of values from API factories) with React's
 * useSyncExternalStore hook.
 *
 * This should not be used directly from within React, but should instead be
 * composed into other classes (such as API factories). Those classes can then
 * be brought into React.
 *
 * As long as you can figure out how to turn the mutable values in some other
 * class into an immutable snapshot, all you have to do is pass the new snapshot
 * into this class. It will then take care of notifying subscriptions, while
 * reconciling old/new snapshots to minimize needless re-renders.
 */
import type { ReadonlyJsonValue } from '../typesConstants';

type SubscriptionCallback<TSnapshot extends ReadonlyJsonValue> = (
  snapshot: TSnapshot,
) => void;

type DidSnapshotsChange<TSnapshot extends ReadonlyJsonValue> = (
  oldSnapshot: TSnapshot,
  newSnapshot: TSnapshot,
) => boolean;

type SnapshotManagerOptions<TSnapshot extends ReadonlyJsonValue> = Readonly<{
  initialSnapshot: TSnapshot;

  /**
   * Lets you define a custom comparison strategy for detecting whether a
   * snapshot has really changed in a way that should be reflected in the UI.
   */
  didSnapshotsChange?: DidSnapshotsChange<TSnapshot>;
}>;

interface SnapshotManagerApi<TSnapshot extends ReadonlyJsonValue> {
  subscribe: (callback: SubscriptionCallback<TSnapshot>) => () => void;
  unsubscribe: (callback: SubscriptionCallback<TSnapshot>) => void;
  getSnapshot: () => TSnapshot;
  updateSnapshot: (newSnapshot: TSnapshot) => void;
}

function areSameByReference(v1: unknown, v2: unknown) {
  // Comparison looks wonky, but Object.is handles more edge cases than ===
  // for these kinds of comparisons, but it itself has an edge case
  // with -0 and +0. Still need === to handle that comparison
  return Object.is(v1, v2) || (v1 === 0 && v2 === 0);
}

/**
 * Favors shallow-ish comparisons (will check one level deep for objects and
 * arrays, but no more)
 */
export function defaultDidSnapshotsChange<TSnapshot extends ReadonlyJsonValue>(
  oldSnapshot: TSnapshot,
  newSnapshot: TSnapshot,
): boolean {
  if (areSameByReference(oldSnapshot, newSnapshot)) {
    return false;
  }

  const oldIsPrimitive =
    typeof oldSnapshot !== 'object' || oldSnapshot === null;
  const newIsPrimitive =
    typeof newSnapshot !== 'object' || newSnapshot === null;

  if (oldIsPrimitive && newIsPrimitive) {
    const numbersAreWithinTolerance =
      typeof oldSnapshot === 'number' &&
      typeof newSnapshot === 'number' &&
      Math.abs(oldSnapshot - newSnapshot) < 0.00005;

    if (numbersAreWithinTolerance) {
      return false;
    }

    return oldSnapshot !== newSnapshot;
  }

  const changedFromObjectToPrimitive = !oldIsPrimitive && newIsPrimitive;
  const changedFromPrimitiveToObject = oldIsPrimitive && !newIsPrimitive;

  if (changedFromObjectToPrimitive || changedFromPrimitiveToObject) {
    return true;
  }

  if (Array.isArray(oldSnapshot) && Array.isArray(newSnapshot)) {
    const sameByShallowComparison =
      oldSnapshot.length === newSnapshot.length &&
      oldSnapshot.every((element, index) =>
        areSameByReference(element, newSnapshot[index]),
      );

    return !sameByShallowComparison;
  }

  const oldInnerValues: unknown[] = Object.values(oldSnapshot as Object);
  const newInnerValues: unknown[] = Object.values(newSnapshot as Object);

  if (oldInnerValues.length !== newInnerValues.length) {
    return true;
  }

  for (const [index, value] of oldInnerValues.entries()) {
    if (value !== newInnerValues[index]) {
      return true;
    }
  }

  return false;
}

/**
 * @todo Might eventually make sense to give the class the ability to merge
 * snapshots more surgically and maximize structural sharing (which should be
 * safe since the snapshots are immutable). But we can worry about that when it
 * actually becomes a performance issue
 */
export class StateSnapshotManager<
  TSnapshot extends ReadonlyJsonValue = ReadonlyJsonValue,
> implements SnapshotManagerApi<TSnapshot>
{
  private subscriptions: Set<SubscriptionCallback<TSnapshot>>;
  private didSnapshotsChange: DidSnapshotsChange<TSnapshot>;
  private activeSnapshot: TSnapshot;

  constructor(options: SnapshotManagerOptions<TSnapshot>) {
    const { initialSnapshot, didSnapshotsChange } = options;

    this.subscriptions = new Set();
    this.activeSnapshot = initialSnapshot;
    this.didSnapshotsChange = didSnapshotsChange ?? defaultDidSnapshotsChange;
  }

  private notifySubscriptions(): void {
    const snapshotBinding = this.activeSnapshot;
    this.subscriptions.forEach(cb => cb(snapshotBinding));
  }

  unsubscribe = (callback: SubscriptionCallback<TSnapshot>): void => {
    this.subscriptions.delete(callback);
  };

  subscribe = (callback: SubscriptionCallback<TSnapshot>): (() => void) => {
    this.subscriptions.add(callback);
    return () => this.unsubscribe(callback);
  };

  getSnapshot = (): TSnapshot => {
    return this.activeSnapshot;
  };

  updateSnapshot = (newSnapshot: TSnapshot): void => {
    const snapshotsChanged = this.didSnapshotsChange(
      this.activeSnapshot,
      newSnapshot,
    );

    if (!snapshotsChanged) {
      return;
    }

    this.activeSnapshot = newSnapshot;
    this.notifySubscriptions();
  };
}
