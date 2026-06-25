export interface SnapshotInput { entityType:string; entityId:string; source:string; content:unknown; capturedAt?:Date; }
export class InMemorySnapshotStore { private snapshots: SnapshotInput[] = []; capture(snapshot: SnapshotInput) { const saved={...snapshot,capturedAt:snapshot.capturedAt ?? new Date()}; this.snapshots.push(saved); return saved; } list(){ return [...this.snapshots]; } }
export const snapshotStore = new InMemorySnapshotStore();
