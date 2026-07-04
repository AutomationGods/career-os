import { describe, expect, it } from "vitest";
import { POST as extractClaims } from "../extract-claims/route";
import { POST as importDocument } from "../import/route";
import { POST as uploadDocument } from "../upload/route";

process.env.CAREER_OS_AUTH_DISABLED = "true";
process.env.CAREER_OS_AUTH_DISABLED_USER_ID = "route-user-1";
process.env.CAREER_OS_COMMAND_RUNTIME = "local-memory";

const contentText = "DevOps Engineer\nBuilt AWS Terraform automation with Splunk and Cribl.\nPublic Trust eligible.\nCertification: CISSP.";

describe("source document routes", () => {
  it("routes pasted document import through the Command Bus", async () => {
    const response = await importDocument(new Request("http://localhost/api/source-documents/import", { method: "POST", body: JSON.stringify({ title: "Route Resume", documentType: "resume", contentText }) }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    expect(body.data.result.document.title).toBe("Route Resume");
  });

  it("uploads a resume file, parses text, and routes import through the Command Bus", async () => {
    const formData = new FormData();
    formData.set("file", new File([contentText], "route-resume.txt", { type: "text/plain" }));
    formData.set("title", "Uploaded Route Resume");

    const response = await uploadDocument(new Request("http://localhost/api/source-documents/upload", { method: "POST", body: formData }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    expect(body.data.result.document.title).toBe("Uploaded Route Resume");
    expect(body.data.result.document.originalFilename).toBe("route-resume.txt");
    expect(body.data.result.document.contentText.includes("Splunk")).toBe(true);
    expect(body.data.parseMetadata.parser).toBe("plain-text");
  });

  it("rejects unsupported resume uploads", async () => {
    const formData = new FormData();
    formData.set("file", new File(["fake image"], "resume.png", { type: "image/png" }));

    const response = await uploadDocument(new Request("http://localhost/api/source-documents/upload", { method: "POST", body: formData }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNSUPPORTED_RESUME_FILE_TYPE");
  });

  it("routes claim extraction through the Command Bus and keeps pasted claims unverified", async () => {
    const formData = new FormData();
    formData.set("file", new File([contentText], "route-resume-claims.txt", { type: "text/plain" }));
    await uploadDocument(new Request("http://localhost/api/source-documents/upload", { method: "POST", body: formData }));
    const response = await extractClaims(new Request("http://localhost/api/source-documents/extract-claims", { method: "POST", body: JSON.stringify({}) }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("completed");
    expect(body.data.result.claims.length > 0).toBe(true);
    expect(body.data.result.claims.some((claim: { suggestedTruthStatus: string }) => claim.suggestedTruthStatus === "verified")).toBe(false);
  });
});
