import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return undefined;

  const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
  const separatorIndex = normalized.indexOf("=");
  if (separatorIndex <= 0) return undefined;

  const key = normalized.slice(0, separatorIndex).trim();
  const rawValue = normalized.slice(separatorIndex + 1).trim();
  const value = rawValue.replace(/^['\"]|['\"]$/g, "");
  return key ? { key, value } : undefined;
}

export function loadRootEnvFile(startDirectory = process.cwd()) {
  if (process.env.DATABASE_URL) return;

  let directory = resolve(startDirectory);
  while (true) {
    const envPath = join(directory, ".env");
    if (existsSync(envPath)) {
      for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const entry = parseEnvLine(line);
        if (entry && process.env[entry.key] === undefined) process.env[entry.key] = entry.value;
      }
      return;
    }

    const parent = dirname(directory);
    if (parent === directory) return;
    directory = parent;
  }
}

loadRootEnvFile();

type PrismaGlobal = typeof globalThis & { __careerOsPrisma?: PrismaClient };

const prismaGlobal = globalThis as PrismaGlobal;

export const prisma = prismaGlobal.__careerOsPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") prismaGlobal.__careerOsPrisma = prisma;
