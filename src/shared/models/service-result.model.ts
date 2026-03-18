export class ServiceResult<T> {
  data: T;
  isSuccess: boolean;
  totalSuccess: number;
  message: string;
  codeId: number;
}

export interface PagedListResponse<T> {
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  totalPages: number;
  totalCount: number;
  items: T[]
}
