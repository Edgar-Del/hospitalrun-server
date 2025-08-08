import { FastifyPluginAsync } from 'fastify'
import * as crypto from 'crypto'

interface RateLimitConfig {
  windowMs: number
  max: number
  message: string
  statusCode: number
}

interface SecurityConfig {
  rateLimits: {
    global: RateLimitConfig
    auth: RateLimitConfig
    api: RateLimitConfig
  }
  cors: {
    origin: string[]
    credentials: boolean
  }
  helmet: {
    contentSecurityPolicy: boolean
    hsts: boolean
    noSniff: boolean
    xssFilter: boolean
  }
}

// Armazenamento em memória para rate limiting (em produção seria Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

const securityPlugin: FastifyPluginAsync = async (fastify) => {
  // Configurações de segurança
  const securityConfig: SecurityConfig = {
    rateLimits: {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 100, // máximo 100 requests por janela
        message: 'Muitas requisições. Tente novamente mais tarde.',
        statusCode: 429
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // máximo 5 tentativas de login
        message: 'Muitas tentativas de login. Tente novamente mais tarde.',
        statusCode: 429
      },
      api: {
        windowMs: 60 * 1000, // 1 minuto
        max: 30, // máximo 30 requests por minuto
        message: 'Limite de API excedido. Tente novamente mais tarde.',
        statusCode: 429
      }
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    },
    helmet: {
      contentSecurityPolicy: true,
      hsts: true,
      noSniff: true,
      xssFilter: true
    }
  }

  // Rate limiting middleware
  fastify.decorate('rateLimit', {
    check: (key: string, config: RateLimitConfig): boolean => {
      const now = Date.now()
      const windowStart = now - config.windowMs
      
      const current = rateLimitStore.get(key)
      
      if (!current || current.resetTime < now) {
        // Primeira requisição ou janela expirada
        rateLimitStore.set(key, {
          count: 1,
          resetTime: now + config.windowMs
        })
        return true
      }
      
      if (current.count >= config.max) {
        return false // Limite excedido
      }
      
      // Incrementar contador
      current.count++
      return true
    },
    
    getRemaining: (key: string, config: RateLimitConfig): number => {
      const current = rateLimitStore.get(key)
      if (!current) return config.max
      return Math.max(0, config.max - current.count)
    },
    
    getResetTime: (key: string): number => {
      const current = rateLimitStore.get(key)
      return current?.resetTime || Date.now()
    }
  })

  // Validação de inputs
  fastify.decorate('inputValidation', {
    sanitizeString: (input: string): string => {
      return input
        .replace(/[<>]/g, '') // Remover < e >
        .replace(/javascript:/gi, '') // Remover javascript:
        .replace(/on\w+=/gi, '') // Remover event handlers
        .trim()
    },
    
    validateEmail: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    },
    
    validatePhone: (phone: string): boolean => {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
      return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
    },
    
    validateSSN: (ssn: string): boolean => {
      // Formato brasileiro: XXX.XXX.XXX-XX
      const ssnRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
      return ssnRegex.test(ssn)
    },
    
    validateDate: (date: string): boolean => {
      const dateObj = new Date(date)
      return dateObj instanceof Date && !isNaN(dateObj.getTime())
    },
    
    validateObject: (obj: any, schema: Record<string, any>): { valid: boolean; errors: string[] } => {
      const errors: string[] = []
      
      for (const [field, rules] of Object.entries(schema)) {
        const value = obj[field]
        
        if (rules.required && !value) {
          errors.push(`${field} é obrigatório`)
          continue
        }
        
        if (value) {
          if (rules.type && typeof value !== rules.type) {
            errors.push(`${field} deve ser do tipo ${rules.type}`)
          }
          
          if (rules.minLength && value.length < rules.minLength) {
            errors.push(`${field} deve ter pelo menos ${rules.minLength} caracteres`)
          }
          
          if (rules.maxLength && value.length > rules.maxLength) {
            errors.push(`${field} deve ter no máximo ${rules.maxLength} caracteres`)
          }
          
          if (rules.pattern && !rules.pattern.test(value)) {
            errors.push(`${field} tem formato inválido`)
          }
          
          if (rules.enum && !rules.enum.includes(value)) {
            errors.push(`${field} deve ser um dos valores: ${rules.enum.join(', ')}`)
          }
        }
      }
      
      return {
        valid: errors.length === 0,
        errors
      }
    }
  })

  // Proteção contra ataques
  fastify.decorate('security', {
    // Detectar tentativas de SQL Injection
    detectSQLInjection: (input: string): boolean => {
      const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
        /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
        /(\b(union|select|insert|update|delete|drop|create|alter)\b.*\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
        /(--|\/\*|\*\/)/,
        /(\b(exec|execute|sp_|xp_)\b)/i
      ]
      
      return sqlPatterns.some(pattern => pattern.test(input))
    },
    
    // Detectar tentativas de XSS
    detectXSS: (input: string): boolean => {
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe[^>]*>/gi,
        /<object[^>]*>/gi,
        /<embed[^>]*>/gi,
        /<form[^>]*>/gi,
        /<input[^>]*>/gi
      ]
      
      return xssPatterns.some(pattern => pattern.test(input))
    },
    
    // Detectar tentativas de Path Traversal
    detectPathTraversal: (input: string): boolean => {
      const pathTraversalPatterns = [
        /\.\.\//,
        /\.\.\\/,
        /%2e%2e%2f/,
        /%2e%2e%5c/,
        /\.\.%2f/,
        /\.\.%5c/
      ]
      
      return pathTraversalPatterns.some(pattern => pattern.test(input))
    },
    
    // Sanitizar input
    sanitizeInput: (input: string): string => {
      return input
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .replace(/\.\.\//g, '')
        .replace(/\.\.\\/g, '')
        .trim()
    },
    
    // Gerar nonce para CSP
    generateNonce: (): string => {
      return crypto.randomBytes(16).toString('base64')
    },
    
    // Validar token CSRF
    validateCSRFToken: (token: string, sessionToken: string): boolean => {
      return token === sessionToken
    }
  })

  // Hook para rate limiting
  fastify.addHook('preHandler', async (request, reply) => {
    const clientIP = request.ip
    const userAgent = request.headers['user-agent'] || ''
    const isAuthEndpoint = request.url.includes('/auth')
    
    // Determinar configuração de rate limit
    let config: RateLimitConfig
    let key: string
    
    if (isAuthEndpoint) {
      config = securityConfig.rateLimits.auth
      key = `auth:${clientIP}`
    } else {
      config = securityConfig.rateLimits.api
      key = `api:${clientIP}`
    }
    
    // Verificar rate limit
    if (!fastify.rateLimit.check(key, config)) {
      const resetTime = fastify.rateLimit.getResetTime(key)
      
      reply.header('X-RateLimit-Limit', config.max)
      reply.header('X-RateLimit-Remaining', 0)
      reply.header('X-RateLimit-Reset', resetTime)
      reply.header('Retry-After', Math.ceil((resetTime - Date.now()) / 1000))
      
      return reply.status(config.statusCode).send({
        error: 'Rate Limit Exceeded',
        message: config.message,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      })
    }
    
    // Adicionar headers de rate limit
    const remaining = fastify.rateLimit.getRemaining(key, config)
    const resetTime = fastify.rateLimit.getResetTime(key)
    
    reply.header('X-RateLimit-Limit', config.max)
    reply.header('X-RateLimit-Remaining', remaining)
    reply.header('X-RateLimit-Reset', resetTime)
  })

  // Hook para validação de inputs
  fastify.addHook('preHandler', async (request, reply) => {
    // Validar query parameters
    if (request.query) {
      for (const [key, value] of Object.entries(request.query)) {
        if (typeof value === 'string') {
          // Detectar ataques
          if (fastify.security.detectSQLInjection(value)) {
            return reply.status(400).send({
              error: 'Invalid Input',
              message: 'Detectado possível tentativa de SQL Injection'
            })
          }
          
          if (fastify.security.detectXSS(value)) {
            return reply.status(400).send({
              error: 'Invalid Input',
              message: 'Detectado possível tentativa de XSS'
            })
          }
          
          if (fastify.security.detectPathTraversal(value)) {
            return reply.status(400).send({
              error: 'Invalid Input',
              message: 'Detectado possível tentativa de Path Traversal'
            })
          }
          
          // Sanitizar input
          request.query[key] = fastify.security.sanitizeInput(value)
        }
      }
    }
    
    // Validar body
    if (request.body && typeof request.body === 'object') {
      for (const [key, value] of Object.entries(request.body)) {
        if (typeof value === 'string') {
          // Detectar ataques
          if (fastify.security.detectSQLInjection(value)) {
            return reply.status(400).send({
              error: 'Invalid Input',
              message: 'Detectado possível tentativa de SQL Injection'
            })
          }
          
          if (fastify.security.detectXSS(value)) {
            return reply.status(400).send({
              error: 'Invalid Input',
              message: 'Detectado possível tentativa de XSS'
            })
          }
          
          // Sanitizar input
          request.body[key] = fastify.security.sanitizeInput(value)
        }
      }
    }
  })

  // Hook para headers de segurança
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Content Security Policy
    const nonce = fastify.security.generateNonce()
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
    
    reply.header('Content-Security-Policy', csp)
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    
    // HSTS (HTTP Strict Transport Security)
    if (process.env.NODE_ENV === 'production') {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
  })
}

export default securityPlugin 