import { FastifyPluginAsync } from 'fastify'

const auditService: FastifyPluginAsync = async (fastify) => {
  // GET /audit/logs - Listar logs de auditoria
  fastify.get('/audit/logs', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          action: { type: 'string' },
          resource: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          limit: { type: 'number', default: 100 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  userId: { type: 'string' },
                  username: { type: 'string' },
                  action: { type: 'string' },
                  resource: { type: 'string' },
                  resourceId: { type: 'string' },
                  ipAddress: { type: 'string' },
                  userAgent: { type: 'string' },
                  timestamp: { type: 'string' },
                  metadata: { type: 'object' }
                }
              }
            },
            total: { type: 'number' },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId, action, resource, startDate, endDate, limit = 100 } = request.query as any
    
    const filters = {
      userId,
      action,
      resource,
      startDate,
      endDate,
      limit
    }
    
    const logs = fastify.audit.getLogs(filters)
    
    return {
      logs,
      total: logs.length,
      pagination: {
        page: 1,
        limit,
        total: logs.length
      }
    }
  })

  // GET /audit/logs/export - Exportar logs de auditoria
  fastify.get('/audit/logs/export', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { format = 'json', startDate, endDate } = request.query as any
    
    const filters = { startDate, endDate }
    const logs = fastify.audit.exportLogs(filters)
    
    if (format === 'csv') {
      const csvHeaders = 'ID,User ID,Username,Action,Resource,Resource ID,IP Address,User Agent,Timestamp\n'
      const csvData = logs.map(log => 
        `${log._id},${log.userId},${log.username},${log.action},${log.resource},${log.resourceId || ''},${log.ipAddress},${log.userAgent},${log.timestamp}`
      ).join('\n')
      
      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', 'attachment; filename="audit_logs.csv"')
      return csvHeaders + csvData
    }
    
    return { logs }
  })

  // GET /audit/stats - Estatísticas de auditoria
  fastify.get('/audit/stats', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            totalLogs: { type: 'number' },
            actions: {
              type: 'object',
              properties: {
                CREATE: { type: 'number' },
                READ: { type: 'number' },
                UPDATE: { type: 'number' },
                DELETE: { type: 'number' },
                LOGIN: { type: 'number' },
                LOGOUT: { type: 'number' }
              }
            },
            resources: {
              type: 'object',
              additionalProperties: { type: 'number' }
            },
            topUsers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  username: { type: 'string' },
                  actionCount: { type: 'number' }
                }
              }
            },
            topIPs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ipAddress: { type: 'string' },
                  actionCount: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { startDate, endDate } = request.query as any
    
    const filters = { startDate, endDate }
    const logs = fastify.audit.getLogs(filters)
    
    // Calcular estatísticas
    const actions: Record<string, number> = {}
    const resources: Record<string, number> = {}
    const userActions: Record<string, number> = {}
    const ipActions: Record<string, number> = {}
    
    logs.forEach(log => {
      // Contar ações
      actions[log.action] = (actions[log.action] || 0) + 1
      
      // Contar recursos
      resources[log.resource] = (resources[log.resource] || 0) + 1
      
      // Contar ações por usuário
      userActions[log.userId] = (userActions[log.userId] || 0) + 1
      
      // Contar ações por IP
      ipActions[log.ipAddress] = (ipActions[log.ipAddress] || 0) + 1
    })
    
    // Top usuários
    const topUsers = Object.entries(userActions)
      .map(([userId, count]) => ({
        userId,
        username: logs.find(log => log.userId === userId)?.username || 'Unknown',
        actionCount: count
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10)
    
    // Top IPs
    const topIPs = Object.entries(ipActions)
      .map(([ipAddress, count]) => ({
        ipAddress,
        actionCount: count
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10)
    
    return {
      totalLogs: logs.length,
      actions,
      resources,
      topUsers,
      topIPs
    }
  })

  // GET /audit/alerts - Alertas de segurança
  fastify.get('/audit/alerts', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  title: { type: 'string' },
                  message: { type: 'string' },
                  timestamp: { type: 'string' },
                  acknowledged: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const logs = fastify.audit.getLogs({ limit: 1000 })
    const alerts = []
    
    // Detectar padrões suspeitos
    const failedLogins = logs.filter(log => 
      log.action === 'LOGIN' && log.metadata?.statusCode === 401
    )
    
    const multipleFailures = failedLogins.reduce((acc, log) => {
      acc[log.ipAddress] = (acc[log.ipAddress] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    // Alertas para múltiplas falhas de login
    Object.entries(multipleFailures).forEach(([ip, count]) => {
      if (count >= 5) {
        alerts.push({
          type: 'security',
          severity: 'high',
          title: 'Multiple Failed Login Attempts',
          message: `${count} failed login attempts from IP ${ip}`,
          timestamp: new Date().toISOString(),
          acknowledged: false
        })
      }
    })
    
    // Detectar acesso a recursos sensíveis
    const sensitiveAccess = logs.filter(log => 
      log.resource === 'patient' && log.action === 'READ' &&
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24h
    )
    
    if (sensitiveAccess.length > 100) {
      alerts.push({
        type: 'security',
        severity: 'medium',
        title: 'High Volume of Patient Data Access',
        message: `${sensitiveAccess.length} patient records accessed in the last 24 hours`,
        timestamp: new Date().toISOString(),
        acknowledged: false
      })
    }
    
    return { alerts }
  })
}

export default auditService 