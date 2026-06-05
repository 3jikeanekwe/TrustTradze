export interface AdminLog {
  id: string;

  actorUid: string;

  actorEmail: string;

  action: string;

  targetUid: string;

  createdAt: string;
}
