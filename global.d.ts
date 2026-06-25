declare module "*.css";
declare module "react" { export type ReactNode = unknown; }
declare module "react/jsx-runtime" { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
declare module "next" { export type Metadata = Record<string, unknown>; }
declare module "bullmq" { export class Queue { constructor(name: string, options?: unknown); add(name: string, data: unknown): Promise<unknown>; } }
declare module "@prisma/client" { export class PrismaClient { constructor(); } }
declare module "vitest" { export function describe(name: string, fn: () => void): void; export function it(name: string, fn: () => void): void; export const expect: (value: unknown) => { toBe(expected: unknown): void }; }
declare const process: { env: Record<string, string | undefined> };
