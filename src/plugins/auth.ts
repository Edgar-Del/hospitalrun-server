import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'
import { FastifyInstance } from 'fastify'

interface User {
  _id: string
  username: string
  email: string
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist'
  hospitalId: string
  organizationId: string
}

interface AuthRequest {
  user?: User
}

declare module 'fastify' {
  interface FastifyRequest extends AuthRequest {}
}

export default fp(async (fastify: FastifyInstance) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'hospitalrun-secret-key'

  // Decorator para autenticação
  fastify.decorate('authenticate', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        throw new Error('Token não fornecido')
      }

      const decoded = jwt.verify(token, JWT_SECRET) as User
      request.user = decoded
    } catch (error) {
      reply.code(401).send({ error: 'Não autorizado' })
    }
  })

  // Decorator para verificar roles
  fastify.decorate('requireRole', (roles: string[]) => {
    return async (request, reply) => {
      if (!request.user) {
        reply.code(401).send({ error: 'Não autorizado' })
        return
      }

      if (!roles.includes(request.user.role)) {
        reply.code(403).send({ error: 'Acesso negado' })
        return
      }
    }
  })

  // Gerar token JWT
  fastify.decorate('generateToken', (user: User) => {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' })
  })
}) 