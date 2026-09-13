export interface PageParams {
  page: number;
  limit: number;
  skip: number;
}

const MAX_LIMIT = 60;

export function parsePagination(query: Record<string, unknown>): PageParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || 16));
  return { page, limit, skip: (page - 1) * limit };
}
