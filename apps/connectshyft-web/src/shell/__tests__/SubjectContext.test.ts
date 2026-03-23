import { validateSubjectContext } from '@shyft/contracts';
import { describe, expect, it } from 'vitest';

describe('SubjectContext', () => {
  it('rejects contexts that carry both confirmed and provisional ids', () => {
    expect(() =>
      validateSubjectContext({
        orgUnitId: 'org-connectshyft-web-1',
        personId: 'person-connectshyft-web-1',
        provisionalPersonId: 'person-connectshyft-web-2',
      }),
    ).toThrow('SubjectContext cannot include both personId and provisionalPersonId');
  });
});
