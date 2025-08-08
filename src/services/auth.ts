import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'

interface User {
  _id: string
  username: string
  email: string
  password: string
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist'
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface LoginRequest {
  username: string
  password: string
}

interface RegisterRequest {
  username: string
  email: string
  password: string
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist'
  hospitalId: string
  organizationId: string
}

// Simulação de banco de dados em memória (em produção seria CouchDB)
const users: User[] = []

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // Login
  fastify.post('/auth/login', async (request, reply) => {
    const { username, password } = request.body as LoginRequest

    const user = users.find(u => u.username === username)
    if (!user) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const token = fastify.generateToken({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
    })

    reply.send({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
        organizationId: user.organizationId,
      },
    })
  })

  // Registro
  fastify.post('/auth/register', async (request, reply) => {
    const { username, email, password, role, hospitalId, organizationId } = request.body as RegisterRequest

    // Verificar se usuário já existe
    const existingUser = users.find(u => u.username === username || u.email === email)
    if (existingUser) {
      return reply.code(400).send({ error: 'Usuário já existe' })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser: User = {
      _id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      role,
      hospitalId,
      organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    users.push(newUser)

    const token = fastify.generateToken({
      _id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      hospitalId: newUser.hospitalId,
      organizationId: newUser.organizationId,
    })

    reply.code(201).send({
      token,
      user: {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        hospitalId: newUser.hospitalId,
        organizationId: newUser.organizationId,
      },
    })
  })

  // Verificar token
  fastify.get('/auth/me', {
    preHandler: fastify.authenticate,
  }, async (request, reply) => {
    reply.send({ user: request.user })
  })

  // Listar usuários (apenas admin)
  fastify.get('/auth/users', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const userList = users.map(user => ({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }))

    reply.send({ users: userList })
  })

  next()
} 