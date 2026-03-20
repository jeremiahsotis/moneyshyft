export type PersonStatus =
  | 'active_confirmed'
  | 'active_provisional'
  | 'archived'
  | 'suppressed'
  | 'merged';

export type HouseholdStatus = 'active' | 'archived';

export type Person = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  status: PersonStatus;
  mergedIntoPersonId?: string;
  createdAt: string;
  updatedAt: string;
};

export type Household = {
  id: string;
  tenantId: string;
  orgUnitId: string;
  name?: string;
  status: HouseholdStatus;
  createdAt: string;
  updatedAt: string;
};

export type HouseholdMembershipRole = 'head' | 'member' | 'unknown';

export type HouseholdMembership = {
  id: string;
  householdId: string;
  personId: string;
  role: HouseholdMembershipRole;
  isCurrent: boolean;
  startAt?: string;
  endAt?: string;
  createdAt: string;
  updatedAt: string;
};
