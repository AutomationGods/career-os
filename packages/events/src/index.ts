export interface CareerEventInput { eventType:string; entityType:string; entityId:string; domain:string; manager?:string; capability?:string; worker?:string; userId?:string; payload?:unknown; evidence?:unknown; confidence?:number; modelUsed?:string; promptVersion?:string; }
export class InMemoryEventStore { private events: CareerEventInput[] = []; append(event: CareerEventInput) { this.events.push(event); return event; } list() { return [...this.events]; } }
export const eventStore = new InMemoryEventStore();
