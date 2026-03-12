declare module 'supertest' {
  export type SupertestHeaderValue = string | readonly string[] | undefined;

  export interface Response {
    status: number;
    body: any;
    headers: Record<string, SupertestHeaderValue>;
    text?: string;
  }

  export interface Test extends PromiseLike<Response> {
    set(field: string, value: string | readonly string[]): Test;
    set(headers: Record<string, SupertestHeaderValue>): Test;
    query(values: Record<string, unknown> | string): Test;
    send(body?: unknown): Test;
    expect(status: number): Test;
    expect(body: unknown): Test;
    expect(field: string, value: string | RegExp): Test;
    then<TResult1 = Response, TResult2 = never>(
      onfulfilled?: ((value: Response) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2>;
    catch<TResult = never>(
      onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
    ): Promise<Response | TResult>;
    finally(onfinally?: (() => void) | null): Promise<Response>;
  }

  export interface Agent {
    get(url: string): Test;
    post(url: string): Test;
    put(url: string): Test;
    patch(url: string): Test;
    delete(url: string): Test;
    del(url: string): Test;
  }

  interface SuperTestStatic {
    (app: unknown, options?: unknown): Agent;
  }

  const request: SuperTestStatic;

  export default request;
}

declare module 'supertest/lib/test' {
  import type { Test } from 'supertest';

  export = Test;
}
