export interface ActivityLogUser {
  id: number;
  name: string;
  email: string;
}

export interface ActivityLogChanges {
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
}

export interface ActivityLog {
  id: number;
  action: 'created' | 'updated' | 'deleted';
  action_label: string;
  user: ActivityLogUser;
  ip_address?: string;
  changes?: ActivityLogChanges;
  description?: string | null;
  created_at: string;
  created_at_formatted: string;
}

export interface ActivityLogsResponse {
  data: ActivityLog[];
  count: number;
}
