export type NextLike = () => unknown;

export type RequestLike = {
  path?: string;
  method?: string;
  originalUrl?: string;
  cookies?: Record<string, string | undefined>;
  header(name: string): string | undefined;
};

export type ResponseLike = {
  locals: Record<string, unknown>;
  status(code: number): ResponseLike;
  json(payload: unknown): ResponseLike;
  send(payload: unknown): ResponseLike;
  setHeader(name: string, value: string): unknown;
  statusCode: number;
};
