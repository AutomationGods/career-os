export interface StateProjection<T = unknown> { projectionType:string; entityType:string; entityId:string; state:T; updatedAt:Date; }
export class InMemoryStateStore { private state = new Map<string, StateProjection>(); upsert<T>(projection: StateProjection<T>) { this.state.set(`${projection.projectionType}:${projection.entityType}:${projection.entityId}`, projection); return projection; } list(){ return [...this.state.values()]; } }
export const stateStore = new InMemoryStateStore();
