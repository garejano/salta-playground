export interface IPaging<T> {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalCount: number;
    items: T[];
}

export interface IPagingParams {
    page: number;
    limit: number;
}