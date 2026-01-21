class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'RepositoryError'
  }
}

export class DuplicateOfferError extends RepositoryError {
  constructor(
    public readonly productId: number,
    public readonly buyerId: number
  ) {
    super('Buyer already has a pending offer on this product', 'DUPLICATE_OFFER')
    this.name = 'DuplicateOfferError'
  }
}

export class VersionConflictError extends RepositoryError {
  constructor(
    public readonly entity: string,
    public readonly id: number
  ) {
    super(`Concurrent modification detected for ${entity}`, 'VERSION_CONFLICT')
    this.name = 'VersionConflictError'
  }
}
