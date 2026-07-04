import { buildCareerCommandSourceDiagnostic, careerCommandManualSearchQueries, careerCommandManualSearchSites } from "@career-os/domains";

export async function GET() {
  return Response.json({
    ok: true,
    data: {
      ...buildCareerCommandSourceDiagnostic(),
      manualSearchQueries: careerCommandManualSearchQueries,
      manualSearchSites: careerCommandManualSearchSites,
      note: "Career Command uses Remotive public API and user-pasted Manual Job Import only. Disabled scraping/integration sources are not searched."
    }
  });
}
