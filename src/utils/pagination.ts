// This pagination logic would be used later, for initial version relese paagination would not be implemented

type PaginationMeta = {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
};

export type PaginationResult = {
  limit: number;
  skip: number;
  page: number;
  getPaginationMeta: (
    totalItems: number,
    currentItemCount: number
  ) => PaginationMeta;
};

export const getPagination = (query: {
  page?: any;
  limit?: any;
}): PaginationResult => {
  const page = Math.abs(parseInt(query.page)) || 1;
  const limit = Math.abs(parseInt(query.limit)) || 10;
  const skip = (page - 1) * limit;

  const getPaginationMeta = (
    totalItems: number,
    currentItemCount: number
  ): PaginationMeta => {
    return {
      totalItems,
      itemCount: currentItemCount,
      itemsPerPage: limit,
      totalPages: Math.ceil(totalItems / limit),
      currentPage: page,
    };
  };

  return {
    limit,
    skip,
    page,
    getPaginationMeta,
  };
};
