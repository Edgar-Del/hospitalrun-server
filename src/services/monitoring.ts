import { FastifyPluginAsync } from 'fastify'

const monitoringService: FastifyPluginAsync = async (fastify) => {
  // GET /monitoring/dashboard - Dashboard de monitoramento
  fastify.get('/monitoring/dashboard', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            currentMetrics: {
              type: 'object',
              properties: {
                cpu: { type: 'number' },
                memory: { type: 'number' },
                uptime: { type: 'number' },
                requestsPerSecond: { type: 'number' },
                errorRate: { type: 'number' },
                systemHealth: { type: 'string' }
              }
            },
            recentAlerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  title: { type: 'string' },
                  message: { type: 'string' },
                  timestamp: { type: 'string' },
                  acknowledged: { type: 'boolean' }
                }
              }
            },
            summary: {
              type: 'object',
              properties: {
                totalRequests: { type: 'number' },
                totalErrors: { type: 'number' },
                uptime: { type: 'number' },
                systemHealth: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    return fastify.monitoring.getDashboard()
  })

  // GET /monitoring/alerts - Listar alertas
  fastify.get('/monitoring/alerts', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          acknowledged: { type: 'boolean' },
          limit: { type: 'number', default: 50 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            alerts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  title: { type: 'string' },
                  message: { type: 'string' },
                  timestamp: { type: 'string' },
                  acknowledged: { type: 'boolean' }
                }
              }
            },
            total: { type: 'number' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { severity, acknowledged, limit = 50 } = request.query as any
    
    const filters: any = {}
    if (severity) filters.severity = severity
    if (acknowledged !== undefined) filters.acknowledged = acknowledged
    
    const alerts = fastify.monitoring.getAlerts(filters)
    
    return {
      alerts: alerts.slice(0, limit),
      total: alerts.length
    }
  })

  // POST /monitoring/alerts/:id/acknowledge - Reconhecer alerta
  fastify.post('/monitoring/alerts/:id/acknowledge', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as any
    const user = request.user as any
    
    const alerts = fastify.monitoring.getAlerts()
    const alert = alerts.find(a => a._id === id)
    
    if (!alert) {
      return reply.status(404).send({
        success: false,
        message: 'Alerta não encontrado'
      })
    }
    
    alert.acknowledged = true
    
    return {
      success: true,
      message: 'Alerta reconhecido com sucesso'
    }
  })

  // GET /monitoring/metrics - Métricas detalhadas
  fastify.get('/monitoring/metrics', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['1h', '6h', '24h', '7d'], default: '24h' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            metrics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: { type: 'string' },
                  cpu: { type: 'number' },
                  memory: { type: 'number' },
                  requestsPerSecond: { type: 'number' },
                  errorRate: { type: 'number' },
                  systemHealth: { type: 'string' }
                }
              }
            },
            averages: {
              type: 'object',
              properties: {
                cpu: { type: 'number' },
                memory: { type: 'number' },
                requestsPerSecond: { type: 'number' },
                errorRate: { type: 'number' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { period = '24h' } = request.query as any
    
    // Em produção, isso viria de um banco de dados de séries temporais
    const currentMetrics = fastify.monitoring.collectMetrics()
    
    // Simular histórico de métricas
    const now = Date.now()
    const periodMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    }[period] || 24 * 60 * 60 * 1000
    
    const metrics = []
    const interval = periodMs / 24 // 24 pontos de dados
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now - (i * interval))
      metrics.push({
        timestamp: timestamp.toISOString(),
        cpu: currentMetrics.cpu + (Math.random() - 0.5) * 10,
        memory: currentMetrics.memory + (Math.random() - 0.5) * 5,
        requestsPerSecond: currentMetrics.requestsPerSecond + (Math.random() - 0.5) * 2,
        errorRate: currentMetrics.errorRate + (Math.random() - 0.5) * 1,
        systemHealth: currentMetrics.systemHealth
      })
    }
    
    // Calcular médias
    const averages = {
      cpu: metrics.reduce((sum, m) => sum + m.cpu, 0) / metrics.length,
      memory: metrics.reduce((sum, m) => sum + m.memory, 0) / metrics.length,
      requestsPerSecond: metrics.reduce((sum, m) => sum + m.requestsPerSecond, 0) / metrics.length,
      errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length
    }
    
    return { metrics, averages }
  })

  // GET /monitoring/health - Health check detalhado
  fastify.get('/monitoring/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            environment: { type: 'string' },
            checks: {
              type: 'object',
              properties: {
                database: { type: 'object' },
                memory: { type: 'object' },
                cpu: { type: 'object' },
                disk: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const metrics = fastify.monitoring.collectMetrics()
    
    const healthChecks = {
      database: {
        status: 'healthy',
        responseTime: Math.random() * 10 + 1
      },
      memory: {
        status: metrics.memory > 90 ? 'critical' : metrics.memory > 70 ? 'warning' : 'healthy',
        usage: metrics.memory
      },
      cpu: {
        status: metrics.cpu > 90 ? 'critical' : metrics.cpu > 70 ? 'warning' : 'healthy',
        usage: metrics.cpu
      },
      disk: {
        status: 'healthy',
        usage: 45.2 // Simulado
      }
    }
    
    const overallStatus = Object.values(healthChecks).some(check => check.status === 'critical') 
      ? 'critical' 
      : Object.values(healthChecks).some(check => check.status === 'warning')
      ? 'warning'
      : 'healthy'
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: healthChecks
    }
  })

  // POST /monitoring/alerts - Criar alerta manual
  fastify.post('/monitoring/alerts', {
    preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    schema: {
      body: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['system', 'business', 'security', 'performance'] },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          title: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['type', 'severity', 'title', 'message']
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            alert: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
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
  }, async (request, reply) => {
    const { type, severity, title, message } = request.body as any
    
    const alert = fastify.monitoring.createAlert({
      type,
      severity,
      title,
      message,
      acknowledged: false
    })
    
    reply.status(201)
    return {
      success: true,
      alert
    }
  })
}

export default monitoringService 