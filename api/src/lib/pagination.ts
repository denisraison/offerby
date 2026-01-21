export type Cursor = { createdAt: Date; id: number }

export interface PaginatedResult<T> {
  items: T[]
  hasMore: boolean
  nextCursor?: Cursor
}

export function extractPagination<T extends { createdAt: Date; id: number }>(
  items: T[],
  limit: number
): PaginatedResult<T> {
  const hasMore = items.length > limit
  const pageItems = hasMore ? items.slice(0, limit) : items
  const nextCursor =
    hasMore && pageItems.length > 0
      ? {
          createdAt: pageItems[pageItems.length - 1].createdAt,
          id: pageItems[pageItems.length - 1].id,
        }
      : undefined

  return { items: pageItems, hasMore, nextCursor }
}
