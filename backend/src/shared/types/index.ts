export interface JwtPayload {
  id: string;
  accountId: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload;
  }
}
