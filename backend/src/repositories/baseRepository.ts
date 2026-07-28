import { prisma } from "../config/prisma.js";
import { Prisma } from "../../prisma/generated/client/index.js";
import { AppError, ConflictError, InternalServerError, NotFoundError } from "../utils/errors.js";
import { withRetry } from "../utils/retry.js";

function handlePrismaError(error: any, modelName: string, operation: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") {
      throw new NotFoundError(`${modelName} required for ${operation} not found.`);
    }
    if (error.code === "P2002") {
      const field = error.meta?.target ? (error.meta.target as string[]).join(", ") : "";
      throw new ConflictError(`Conflict: A record with this unique field ${field} already exists.`);
    }
    if (error.code === "P2023") {
      throw new NotFoundError(`Invalid ID format supplied for ${modelName}`);
    }
  }
  throw new InternalServerError(
    `[Prisma Failure]: Failed ${operation} ${modelName} due to server error.`,
  );
}

export default class BaseRepository<T = any> {
  protected modelName: string;
  protected model: any;

  constructor(modelName: string) {
    if (!modelName || typeof modelName !== "string") {
      throw new AppError(`A ${modelName} model name (string) is required for BaseRepository.`);
    }
    this.modelName = modelName;
    const modelKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    this.model = (prisma as any)[modelKey];

    if (!this.model || typeof this.model.findUnique !== "function") {
      throw new NotFoundError(`${modelName} not found or is invalid in Prisma Client.`);
    }
  }

  async create(data: any, options: any = {}): Promise<T> {
    try {
      return await withRetry(() => this.model.create({ data, ...options }));
    } catch (error) {
      return handlePrismaError(error, this.modelName, "creation");
    }
  }

  async findById(id: string, options: any = {}): Promise<T> {
    try {
      const record = await withRetry(() => this.model.findUnique({ where: { id }, ...options }));
      if (!record) throw new NotFoundError(`${this.modelName} with ID ${id} not found`);
      return record as T;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      return handlePrismaError(error, this.modelName, "fetching");
    }
  }

  async findOne(where: any, options: any = {}): Promise<T | null> {
    try {
      return await withRetry(() => this.model.findFirst({ where, ...options }));
    } catch (error) {
      return handlePrismaError(error, this.modelName, "fetching one");
    }
  }

  async findAll(options: any = {}): Promise<T[]> {
    try {
      return await withRetry(() => this.model.findMany({ ...options }));
    } catch (error) {
      return handlePrismaError(error, this.modelName, "fetching all");
    }
  }

  async update(id: string, data: any, options: any = {}): Promise<T> {
    try {
      return await withRetry(() => this.model.update({ where: { id }, data, ...options }));
    } catch (error) {
      return handlePrismaError(error, this.modelName, "updating");
    }
  }

  async delete(id: string, options: any = {}): Promise<boolean> {
    try {
      await withRetry(() => this.model.delete({ where: { id }, ...options }));
      return true;
    } catch (error) {
      return handlePrismaError(error, this.modelName, "deleting");
    }
  }
}
