# Career Opportunities Domain

Finds public jobs from Career Profile keywords, ranks them, and creates local application packets.

Status: partial vertical-slice implementation.

Commands:
- `career_opportunities.find_jobs`
- `career_opportunities.rank`
- `career_opportunities.create_packet`

Events:
- `career_opportunity.created`
- `career_opportunity.scored`
- `career_opportunity.prioritized`
- `career_opportunity.status_updated`
- `career_opportunity.next_action_set`
- `career_opportunity.discovery_failed`

Projection:
- `career_opportunities.current_pipeline`

Safety:
- No auto-apply.
- No email sending.
- No browser automation.
- No LinkedIn scraping.
- Unknown salary, clearance, and company facts remain unknown.
