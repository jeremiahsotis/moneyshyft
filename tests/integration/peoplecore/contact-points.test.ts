import request from 'supertest';
import app from '../../../apps/connectshyft-api/src/app';

describe('peoplecore contact points', () => {
  it('creates a contact point, lists contact points, and creates a link', async () => {
    const createContactPointResponse = await (request as any)(app).post('/people/contact-points').send({
      type: 'phone',
      normalizedValue: '+12605551212',
      rawValue: '(260) 555-1212',
    });

    expect(createContactPointResponse.status).toBe(200);
    expect(createContactPointResponse.body.type).toBe('phone');
    expect(createContactPointResponse.body.normalizedValue).toBe('+12605551212');
    expect(createContactPointResponse.body.status).toBe('active_personal');
    expect(createContactPointResponse.body.suspectedShared).toBe(false);
    expect(createContactPointResponse.body.confirmedShared).toBe(false);
    expect(createContactPointResponse.body.reassignmentSuspected).toBe(false);

    const listContactPointsResponse = await (request as any)(app).get('/people/contact-points');

    expect(listContactPointsResponse.status).toBe(200);
    expect(listContactPointsResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createContactPointResponse.body.id,
          normalizedValue: '+12605551212',
          status: 'active_personal',
        }),
      ]),
    );

    const createContactPointLinkResponse = await (request as any)(app)
      .post('/people/contact-point-links')
      .send({
        contactPointId: createContactPointResponse.body.id,
        subjectType: 'person',
        subjectId: 'person_1',
        linkType: 'primary',
        confidenceBand: 'high',
      });

    expect(createContactPointLinkResponse.status).toBe(200);
    expect(createContactPointLinkResponse.body.contactPointId).toBe(createContactPointResponse.body.id);
    expect(createContactPointLinkResponse.body.subjectType).toBe('person');
    expect(createContactPointLinkResponse.body.linkType).toBe('primary');
    expect(createContactPointLinkResponse.body.isCurrent).toBe(true);
    expect(createContactPointLinkResponse.body.isPrimary).toBe(true);
    expect(createContactPointLinkResponse.body.linkedBy).toBe('system');
  });
});
