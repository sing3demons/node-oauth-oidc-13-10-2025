import { 
  Collection, 
  ObjectId, 
  Filter, 
  UpdateFilter, 
  FindOptions, 
  Document,
  InsertOneResult,
  UpdateResult,
  DeleteResult,
  WithId,
  OptionalUnlessRequiredId
} from 'mongodb';
import { DatabaseService } from '../services/database.service.js';
import { IRepository, IPaginationOptions, IPaginatedResult } from './interfaces/base.repository.interface.js';

export abstract class BaseRepository<T extends Document> implements IRepository<T> {
  protected abstract collectionName: string;
  
  protected get collection(): Collection<T> {
    const db = DatabaseService.getInstance();
    return db.getDb().collection<T>(this.collectionName);
  }

  async findOne(filter: Filter<T>, options?: FindOptions<T>): Promise<T | null> {
    const result = await this.collection.findOne(filter, options);
    return result as T | null;
  }

  async findById(id: string | ObjectId): Promise<T | null> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    const result = await this.collection.findOne({ _id: objectId } as Filter<T>);
    return result as T | null;
  }

  async find(filter: Filter<T> = {}, options?: FindOptions<T>): Promise<T[]> {
    const results = await this.collection.find(filter, options).toArray();
    return results as T[];
  }

  async findPaginated(
    filter: Filter<T> = {}, 
    pagination: IPaginationOptions = {}
  ): Promise<IPaginatedResult<T>> {
    const { page = 1, limit = 10, sortBy = '_id', sortOrder = 'desc' } = pagination;
    
    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;

    const [data, total] = await Promise.all([
      this.collection
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .toArray(),
      this.collection.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data as T[],
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  async create(document: Omit<T, '_id'>): Promise<T> {
    const now = new Date();
    const docWithTimestamps = {
      ...document,
      createdAt: now,
      updatedAt: now
    } as unknown as OptionalUnlessRequiredId<T>;

    const result: InsertOneResult<T> = await this.collection.insertOne(docWithTimestamps);
    return { ...docWithTimestamps, _id: result.insertedId } as T;
  }

  async createMany(documents: Omit<T, '_id'>[]): Promise<T[]> {
    const now = new Date();
    const docsWithTimestamps = documents.map(doc => ({
      ...doc,
      createdAt: now,
      updatedAt: now
    })) as unknown as OptionalUnlessRequiredId<T>[];

    const result = await this.collection.insertMany(docsWithTimestamps);
    return docsWithTimestamps.map((doc, index) => ({
      ...doc,
      _id: Object.values(result.insertedIds)[index]
    })) as T[];
  }

  async updateOne(filter: Filter<T>, update: UpdateFilter<T>): Promise<boolean> {
    const updateDoc: UpdateFilter<T> = {
      ...update,
      $set: {
        ...(update.$set || {}),
        updatedAt: new Date()
      } as any
    };

    const result: UpdateResult = await this.collection.updateOne(filter, updateDoc);
    return result.modifiedCount > 0;
  }

  async updateById(id: string | ObjectId, update: UpdateFilter<T>): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.updateOne({ _id: objectId } as Filter<T>, update);
  }

  async updateMany(filter: Filter<T>, update: UpdateFilter<T>): Promise<number> {
    const updateDoc: UpdateFilter<T> = {
      ...update,
      $set: {
        ...(update.$set || {}),
        updatedAt: new Date()
      } as any
    };

    const result: UpdateResult = await this.collection.updateMany(filter, updateDoc);
    return result.modifiedCount;
  }

  async deleteOne(filter: Filter<T>): Promise<boolean> {
    const result: DeleteResult = await this.collection.deleteOne(filter);
    return result.deletedCount > 0;
  }

  async deleteById(id: string | ObjectId): Promise<boolean> {
    const objectId = typeof id === 'string' ? new ObjectId(id) : id;
    return this.deleteOne({ _id: objectId } as Filter<T>);
  }

  async deleteMany(filter: Filter<T>): Promise<number> {
    const result: DeleteResult = await this.collection.deleteMany(filter);
    return result.deletedCount;
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    return this.collection.countDocuments(filter);
  }

  async exists(filter: Filter<T>): Promise<boolean> {
    const count = await this.collection.countDocuments(filter, { limit: 1 });
    return count > 0;
  }

  // Utility methods
  async aggregate<R extends Document = any>(pipeline: any[]): Promise<R[]> {
    const results = await this.collection.aggregate<R>(pipeline).toArray();
    return results as R[];
  }

  async distinct(field: string, filter: Filter<T> = {}): Promise<any[]> {
    return this.collection.distinct(field, filter);
  }
}