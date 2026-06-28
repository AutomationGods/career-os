import { describe, expect, it } from "vitest";
import { definition } from "../manager";

describe("document export domain", () => {
  it("is implemented with local export commands", () => {
    expect(definition.status).toBe("implemented");
    expect(definition.commands.includes("document_exports.create_markdown")).toBe(true);
    expect(definition.commands.includes("document_exports.create_docx")).toBe(true);
  });
});
