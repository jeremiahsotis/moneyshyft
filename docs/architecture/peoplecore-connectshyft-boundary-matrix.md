# Boundary Matrix

| Object            | Owner        | Rebind Class       |
| ----------------- | ------------ | ------------------ |
| Person            | PeopleCore   | auto_rebind        |
| Household         | PeopleCore   | review_rebind      |
| Address           | PeopleCore   | review_rebind      |
| Relationship      | PeopleCore   | review_rebind      |
| ContactPoint      | PeopleCore   | auto_rebind        |
| ContactPointLink  | PeopleCore   | review_rebind      |
| ContactPointEvent | PeopleCore   | historical_only    |
| Conversation      | ConnectShyft | auto_rebind        |
| Message           | ConnectShyft | historical_only    |
| DeliveryAttempt   | ConnectShyft | historical_only    |
| Call              | ConnectShyft | historical_only    |
| Voicemail         | ConnectShyft | historical_only    |
| CallRecording     | ConnectShyft | historical_only    |
| ProviderEvent     | ConnectShyft | historical_only    |
| TimelineEvent     | ConnectShyft | derived_projection |
| WorkIntent        | ConnectShyft | review_rebind      |
| ResolverReview    | Identity     | historical_only    |
