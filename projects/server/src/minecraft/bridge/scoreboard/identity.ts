import { ScoreboardIdentityDescriptor, ScoreboardIdentityType, UniqueId } from '@discord-mcbe/shared';

export class ScoreboardIdentity {
  readonly type: ScoreboardIdentityType;

  readonly displayName: string;

  readonly id: number;

  private _entityUniqueId?: UniqueId;

  constructor(descriptor: ScoreboardIdentityDescriptor) {
    this.type = descriptor.type;
    this.id = descriptor.id;
    this.displayName = descriptor.displayName;
    this._entityUniqueId = descriptor.entityUniqueId;
  }

  /**
   * Returns entityUniqueId if the identity type is Entity or Player. If player is offline, returns undefined.
   * @throws Error if the identity type is FakePlayer.
   */
  get entityUniqueId(): UniqueId | undefined {
    if (this.type === ScoreboardIdentityType.Entity || this.type === ScoreboardIdentityType.Player) {
      return this._entityUniqueId;
    } else {
      throw new Error('entityUniqueId is not available for this identity type');
    }
  }
}
