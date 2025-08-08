import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import fastifyCors from 'fastify-cors'
import fastifyHelmet from 'fastify-helmet'
import fastifyAutoload from 'fastify-autoload'
import { join } from 'path'
import GQL from 'fastify-gql'
import schema from './graphql/schema'
import resolvers from './graphql/resolvers'

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // Registrar plugins de segurança primeiro
  fastify.register(import('./plugins/security'))
  fastify.register(import('./plugins/encryption'))
  fastify.register(import('./plugins/audit'))
  fastify.register(import('./plugins/monitoring'))
  fastify.register(import('./plugins/backup'))

  fastify.register(fastifyCors, {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
  })
  
  fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
  
  // Registrar plugin de autenticação
  fastify.register(import('./plugins/auth'))
  
  fastify.register(fastifyAutoload, {
    dir: join(__dirname, 'services'),
  })

  fastify.register(GQL, { schema, resolvers })
  next()
}
