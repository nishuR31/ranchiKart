import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

/**
 * Fastify plugin to register rate limiting globally.
 * Limits are applied per route using the `rateLimit` option.
 */
export default fp(async function (fastify, opts) {
  await fastify.register(rateLimit, {
    max: 100, // default max requests per window per IP
    timeWindow: '1 minute',
    allowList: [], // add trusted IPs if needed
  });
}, {
  name: 'rateLimiter',
});
