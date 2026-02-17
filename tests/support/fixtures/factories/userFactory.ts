import { faker } from '@faker-js/faker';

export type UserFactoryInput = {
  email?: string;
  firstName?: string;
  lastName?: string;
};

export type UserFactoryRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export class UserFactory {
  private readonly createdEntityIds: string[] = [];

  build(overrides: UserFactoryInput = {}): UserFactoryRecord {
    return {
      id: faker.string.uuid(),
      email: overrides.email ?? faker.internet.email().toLowerCase(),
      firstName: overrides.firstName ?? faker.person.firstName(),
      lastName: overrides.lastName ?? faker.person.lastName(),
    };
  }

  trackCreatedEntity(entityId: string): void {
    this.createdEntityIds.push(entityId);
  }

  async cleanup(
    cleanupHandler?: (entityId: string) => Promise<void>,
  ): Promise<void> {
    if (!cleanupHandler) {
      this.createdEntityIds.length = 0;
      return;
    }

    await Promise.all(
      this.createdEntityIds.map(async (entityId) => cleanupHandler(entityId)),
    );
    this.createdEntityIds.length = 0;
  }
}
