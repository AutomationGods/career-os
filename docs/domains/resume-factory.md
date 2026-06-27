# Resume Factory Domain

Resume Factory v1 follows Domain → Manager → Capability → Worker → Tool → Event → State Projection → UI Workspace.

It generates review-required resume drafts from verified facts only.

## Command path

```text
/profile-facts UI → Profile Facts API → Command Bus → Orchestrator → IdentityManager → ProfileFactsStore
/resumes UI → POST /api/resumes → Command Bus → Orchestrator → ResumeFactoryManager → TechnicalResumeWorker → TruthfulnessGuardWorker → Event/State/Snapshot stores
```

## Local workspace

Open `http://localhost:3000/profile-facts` after `npm run dev`, then seed initial facts.

Open `http://localhost:3000/resumes` after the facts exist.

The page posts a safe Splunk / Cribl demo payload, displays the markdown draft, shows truthfulness status, and highlights verified, missing, and blocked keywords.

## Safety boundary

The domain does not invent CISSP, Security+, clearance, fake employers, fake metrics, dates, tools, or experience.

The workspace does not send email, upload documents, submit applications, apply to jobs, scrape LinkedIn, or call an AI provider.
