export type PersonRole = "recruiter" | "hiring_manager" | "interviewer" | "referral" | "hr" | "unknown";
export interface RelationshipPerson { id: string; name: string; normalizedName: string; company?: string; emails: string[]; phones: string[]; roles: PersonRole[]; relevanceScore: number; responsivenessScore: number; trustScore: number; lastContactedAt?: string; nextFollowupAt?: string; }
export interface UpsertPersonInput { name: string; company?: string; emails?: string[]; phones?: string[]; roles?: PersonRole[]; lastContactedAt?: string; nextFollowupAt?: string; }
export interface RelationshipUpsertResult { input: UpsertPersonInput; person: RelationshipPerson; duplicateId?: string; eventType: "relationship.deduplicated" | "relationship.updated"; confidence: number; }

type RelationshipPersonStore = Map<string, RelationshipPerson>;

const people = new Map<string, RelationshipPerson>();
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

function findDuplicate(input: UpsertPersonInput, store: RelationshipPersonStore) {
  const emails = new Set((input.emails ?? []).map(normalize));
  const phones = new Set((input.phones ?? []).map((p) => p.replace(/\D/g, "")));
  const normalizedName = normalize(input.name);
  const company = input.company ? normalize(input.company) : undefined;
  return [...store.values()].find((person) => person.emails.some((email) => emails.has(normalize(email))) || person.phones.some((phone) => phones.has(phone.replace(/\D/g, ""))) || (person.normalizedName === normalizedName && normalize(person.company ?? "") === (company ?? "")));
}

function upsertRelationshipPersonInStore(input: UpsertPersonInput, store: RelationshipPersonStore, mirrorCache: boolean): RelationshipUpsertResult {
  const duplicate = findDuplicate(input, store);
  const nowRoles = new Set<PersonRole>([...(duplicate?.roles ?? []), ...(input.roles ?? ["unknown"])]);
  const person: RelationshipPerson = { id: duplicate?.id ?? `person_${Date.now()}`, name: duplicate?.name ?? input.name, normalizedName: normalize(input.name), company: input.company ?? duplicate?.company, emails: [...new Set([...(duplicate?.emails ?? []), ...(input.emails ?? [])])], phones: [...new Set([...(duplicate?.phones ?? []), ...(input.phones ?? [])])], roles: [...nowRoles], relevanceScore: duplicate?.relevanceScore ?? 0, responsivenessScore: duplicate?.responsivenessScore ?? 0, trustScore: duplicate?.trustScore ?? 0, lastContactedAt: input.lastContactedAt ?? duplicate?.lastContactedAt, nextFollowupAt: input.nextFollowupAt ?? duplicate?.nextFollowupAt };
  store.set(person.id, person);
  if (mirrorCache) cacheRelationshipPerson(person);
  return { input, person, duplicateId: duplicate?.id, eventType: duplicate ? "relationship.deduplicated" : "relationship.updated", confidence: duplicate ? 0.9 : 1 };
}

function relationshipStoreFrom(existingPeople: RelationshipPerson[]) {
  return new Map(existingPeople.map((person) => [person.id, person]));
}

export function cacheRelationshipPerson(person: RelationshipPerson) {
  people.set(person.id, person);
  return person;
}

export function cacheRelationshipPeople(existingPeople: RelationshipPerson[]) {
  for (const person of existingPeople) cacheRelationshipPerson(person);
}

export function upsertRelationshipPersonWithResult(input: UpsertPersonInput): RelationshipUpsertResult {
  return upsertRelationshipPersonInStore(input, people, true);
}

export function upsertRelationshipPerson(input: UpsertPersonInput): RelationshipPerson {
  return upsertRelationshipPersonWithResult(input).person;
}

export function listRelationshipPeople() { return [...people.values()]; }
export function getRelationshipPerson(id: string) { return people.get(id); }
export function dedupeRelationships(inputs: UpsertPersonInput[]) { return inputs.map(upsertRelationshipPerson); }
export function dedupeRelationshipsWithResults(inputs: UpsertPersonInput[], existingPeople: RelationshipPerson[] = listRelationshipPeople(), mirrorCache = true) {
  const scopedPeople = relationshipStoreFrom(existingPeople);
  if (mirrorCache) cacheRelationshipPeople(existingPeople);
  return inputs.map((input) => upsertRelationshipPersonInStore(input, scopedPeople, mirrorCache));
}
