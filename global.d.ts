declare module "*.css";
declare module "react" { export type ReactNode = any; export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void; export function useMemo<T>(factory: () => T, deps: unknown[]): T; export function useState<T>(initialState: T): [T, (value: T | ((previous: T) => T)) => void]; }
declare module "react/jsx-runtime" { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
declare module "next" { export type Metadata = Record<string, unknown>; }
declare module "bullmq" {
  export class Job<DataType = unknown, ResultType = unknown, NameType extends string = string> {
    id?: string;
    name: NameType;
    data: DataType;
    updateProgress(progress: number): Promise<void>;
  }
  export class Queue<DataType = unknown, ResultType = unknown, NameType extends string = string> {
    constructor(name: string, options?: unknown);
    add(name: NameType, data: DataType): Promise<Job<DataType, ResultType, NameType>>;
    close(): Promise<void>;
  }
  export class Worker<DataType = unknown, ResultType = unknown, NameType extends string = string> {
    constructor(name: string, processor: (job: Job<DataType, ResultType, NameType>) => Promise<ResultType>, options?: unknown);
    on(event: string, listener: (...args: any[]) => void): this;
    close(): Promise<void>;
  }
  export class QueueEvents {
    constructor(name: string, options?: unknown);
    close(): Promise<void>;
  }
}
declare module "@prisma/client" { export class PrismaClient { constructor(); $queryRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>; } }
declare module "vitest" { export function describe(name: string, fn: () => void): void; export function it(name: string, fn: () => void | Promise<void>): void; export function beforeEach(fn: () => void | Promise<void>): void; export const expect: (value: unknown) => any; export const vi: any; }
declare const process: { env: Record<string, string | undefined> };
