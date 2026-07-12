import rateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';


/**
 * Fastify plugin to register rate limiting globally.
 * Limits are applied per route using the `rateLimit` option.
 */
export default async function rateLimiter(fastify: FastifyInstance, opts: any) {
  await fastify.register(rateLimit, {
    max: 100, // default max requests per window per IP
    timeWindow: '1 minute',
    allowList: [], // add trusted IPs if needed
  });
}
