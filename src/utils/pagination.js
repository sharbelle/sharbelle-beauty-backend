export const toPaginationMeta = ({ page, limit, totalItems }) => {
  const normalizedTotal = Math.max(0, totalItems);
  const totalPages = Math.max(1, Math.ceil(normalizedTotal / limit));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  return {
    page: currentPage,
    limit,
    totalItems: normalizedTotal,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
};

export const toSkipValue = (page, limit) => {
  return Math.max(0, (page - 1) * limit);
};
