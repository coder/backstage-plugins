import type { ReadonlyJsonValue } from '../typesConstants';

type SubscriptionCallback<TSnapshot extends ReadonlyJsonValue> = (
  snapshot: TSnapshot,
) => void;

type DidSnapshotsChange<TSnapshot extends ReadonlyJsonValue> = (
  snapshot1: TSnapshot,
  snapshot2: TSnapshot,
) => boolean;

type SnapshotManagerOptions<TSnapshot extends ReadonlyJsonValue> = Readonly<{
  initialSnapshot: TSnapshot;
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

  /**
   * Favors shallow-ish comparisons (will check one level deep for objects and
   * arrays)
   */
  private defaultDidSnapshotsChange(
    snapshot1: TSnapshot,
    snapshot2: TSnapshot,
  ): boolean {
    // Have to use both comparison types, because unfortunately, there are
    // different edge cases around both Object.is and ===
    const sameByReference =
      Object.is(snapshot1, snapshot2) || snapshot1 === snapshot2;
    if (sameByReference) {
      return false;
    }

    const wasObjectPrimitiveChange =
      (typeof snapshot1 === 'object' &&
        (typeof snapshot2 !== 'object' || snapshot2 === null)) ||
      ((typeof snapshot1 !== 'object' || snapshot1 === null) &&
        typeof snapshot2 === 'object');
    if (wasObjectPrimitiveChange) {
      return true;
    }

    if (Array.isArray(snapshot1) && Array.isArray(snapshot2)) {
      const sameByShallowComparison =
        snapshot1.length === snapshot2.length &&
        snapshot1.every((element, index) => element === snapshot2[index]);

      return !sameByShallowComparison;
    }

    const values1: unknown[] = Object.values(snapshot1 as Object);
    const values2: unknown[] = Object.values(snapshot2 as Object);

    if (values1.length !== values2.length) {
      return true;
    }

    for (const [index, value] of values1.entries()) {
      if (value !== values2[index]) {
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
