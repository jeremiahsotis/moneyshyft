import 'supertest';
import type superagent from 'superagent';

declare module 'supertest' {
  interface Test extends superagent.SuperAgentRequest {}
}

declare module 'supertest/lib/test' {
  interface Test extends superagent.SuperAgentRequest {}
}

export {};
