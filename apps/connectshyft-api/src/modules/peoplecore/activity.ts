export const ACTIVITY_STATUSES = ['ACTIVE', 'COMPLETED', 'CANCELLED'] as const;

export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];

export type Activity = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  personId: string;
  type: string;
  status: ActivityStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
};

export interface CreateActivityInput {
  tenantId: string;
  orgUnitId: string;
  personId: string;
  type: string;
  status?: ActivityStatus;
}

export interface GetActivityInput {
  tenantId: string;
  orgUnitId: string;
  activityId: string;
}

export interface ListActivitiesInput {
  tenantId: string;
  orgUnitId: string;
  personId: string;
}

export interface PeopleCoreActivityStore {
  createActivity(input: CreateActivityInput): Promise<Activity>;
  getActivity(input: GetActivityInput): Promise<Activity | null>;
  listActivities(input: ListActivitiesInput): Promise<Activity[]>;
}
