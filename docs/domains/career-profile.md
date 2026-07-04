# Career Profile Domain

Generates a Career Profile from `profile_facts.current` only.

Status: partial vertical-slice implementation.

Commands:
- `career_profile.generate`
- `career_profile.get`

Events:
- `career_profile.generation_started`
- `career_profile.generated`
- `career_profile.generation_failed`
- `career_profile.loaded`

Projection:
- `career_profile.current`

Rules:
- Uses Profile Facts, not raw resume text.
- Excludes rejected and blocked facts from safe-use buckets.
- Keeps missing evidence and claims to avoid visible.
