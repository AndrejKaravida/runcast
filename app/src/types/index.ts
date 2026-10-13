import type { Database } from './database';

export type { Database };
export type { Json } from './database';

type Tables = Database['public']['Tables'];

export type TablesInsertRow<Table extends keyof Tables> = Tables[Table]['Insert'];

export type ProfilesRow = Tables['profiles']['Row'];
export type ProfilesUpdate = Tables['profiles']['Update'];
export type RacesRow = Tables['races']['Row'];
export type RacesInsert = Tables['races']['Insert'];
export type PlansRow = Tables['plans']['Row'];
export type PlansInsert = Tables['plans']['Insert'];
export type WorkoutsRow = Tables['workouts']['Row'];
export type WorkoutsInsert = Tables['workouts']['Insert'];
export type WorkoutsUpdate = Tables['workouts']['Update'];
export type RunLogsRow = Tables['run_logs']['Row'];
export type RunLogsInsert = Tables['run_logs']['Insert'];
export type ShoesRow = Tables['shoes']['Row'];
export type ShoesInsert = Tables['shoes']['Insert'];
export type ShoesUpdate = Tables['shoes']['Update'];
export type PushSubscriptionsRow = Tables['push_subscriptions']['Row'];
export type PushSubscriptionsInsert = Tables['push_subscriptions']['Insert'];
export type PushSubscriptionsUpdate = Tables['push_subscriptions']['Update'];
