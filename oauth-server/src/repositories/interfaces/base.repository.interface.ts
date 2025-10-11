import { ObjectId, Filter, UpdateFilter, FindOptions, Document } from 'mongodb';

export interface IRepository<T extends Document> {
  findOne(filter: Filter<T>, options?: FindOptions<T>): Promise<T | null>;
  findById(id: string | ObjectId): Promise<T | null>;
  find(filter: Filter<T>, options?: FindOptions<T>): Promise<T[]>;
  create(document: Omit<T, '_id'>): Promise<T>;
  updateOne(filter: Filter<T>, update: UpdateFilter<T>): Promise<boolean>;
  updateById(id: string | ObjectId, update: UpdateFilter<T>): Promise<boolean>;
  deleteOne(filter: Filter<T>): Promise<boolean>;
  deleteById(id: string | ObjectId): Promise<boolean>;
  deleteMany(filter: Filter<T>): Promise<number>;
  count(filter?: Filter<T>): Promise<number>;
  exists(filter: Filter<T>): Promise<boolean>;
}

export interface IPaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}