/**
 * @file A helper class that simplifies the process of connecting mutable class
 * values (such as the majority of values from API factories) with React's
 * useSyncExternalStore hook.
 *
 * The class will transform the mutable values into immutable snapshots that can
 * safely be referenced within React UI.
 *
 * This should not be used directly, but should instead be composed into other
 * API factories (or equivalent classes).
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
    this.didSnapshotsChange =
      didSnapshotsChange ?? this.defaultDidSnapshotsChange;
  }

  private notifySubscriptions(): void {
    const snapshotBinding = this.activeSnapshot;
    this.subscriptions.forEach(cb => cb(snapshotBinding));
  }

  private static areSameByReference<TSnapshot extends ReadonlyJsonValue>(
    snapshot1: TSnapshot | undefined,
    snapshot2: TSnapshot | undefined,
  ): boolean {
    // Comparison looks wonky, but Object.is handles more edge cases than ===
    // for these kinds of comparisons, but it itself has an edge case
    // with -0 and +0. Still need === to handle that comparison
    return (
      Object.is(snapshot1, snapshot2) || (snapshot1 === 0 && snapshot2 === 0)
    );
  }

  /**
   * Favors shallow-ish comparisons (will check one level deep for objects and
   * arrays)
   */
  private defaultDidSnapshotsChange(
    oldSnapshot: TSnapshot,
    newSnapshot: TSnapshot,
  ): boolean {
    if (StateSnapshotManager.areSameByReference(oldSnapshot, newSnapshot)) {
      return false;
    }

    const changedFromObjectToPrimitive =
      typeof oldSnapshot === 'object' &&
      (typeof newSnapshot !== 'object' || newSnapshot === null);

    const changedFromPrimitiveToObject =
      (typeof oldSnapshot !== 'object' || oldSnapshot === null) &&
      typeof newSnapshot === 'object';

    if (changedFromObjectToPrimitive || changedFromPrimitiveToObject) {
      return true;
    }

    if (Array.isArray(oldSnapshot) && Array.isArray(newSnapshot)) {
      const sameByShallowComparison =
        oldSnapshot.length === newSnapshot.length &&
        oldSnapshot.every((element, index) =>
          StateSnapshotManager.areSameByReference(element, newSnapshot[index]),
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
