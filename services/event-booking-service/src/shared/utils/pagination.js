/**
 * Cursor-based pagination utility
 * Status: Implements "Cursor pagination with a next link" requirement
 */

/**
 * Apply cursor-based pagination to query results
 * @param {Array} items - Array of items to paginate
 * @param {string} cursor - Current cursor (ID of last item from previous page)
 * @param {number} limit - Number of items per page
 * @param {string} idField - Name of the ID field in items
 * @returns {Object} Paginated result with items and next cursor
 */
const paginateCursor = (items, cursor, limit = 10, idField = 'id') => {
  if (!Array.isArray(items)) {
    return { items: [], next: null };
  }

  const hasMore = items.length > limit;
  const paginatedItems = items.slice(0, limit);

  return {
    items: paginatedItems,
    next: hasMore ? paginatedItems[limit - 1]?.[idField] : null,
  };
};

/**
 * Build a cursor pagination query
 * @param {number} limit - Items per page
 * @param {string} cursor - Current cursor
 * @param {string} orderField - Field to order by
 * @returns {Object} Object with LIMIT and WHERE clause for cursor
 */
const getCursorQueryParams = (limit = 10, cursor = null, orderField = 'id') => {
  return {
    limit: limit + 1, // Fetch one extra to check if there are more
    cursorCondition: cursor ? `AND ${orderField} > '${cursor}'` : '',
  };
};

module.exports = {
  paginateCursor,
  getCursorQueryParams,
};
