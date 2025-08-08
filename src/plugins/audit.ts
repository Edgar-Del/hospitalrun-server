import { FastifyPluginAsync } from 'fastify'
import { v4 as uuidv4 } from 'uuid'

export interface AuditLog {
  _id: string
  userId: string
  username: string
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'IMPORT'
  resource: 'patient' | 'doctor' | 'appointment' | 'medication' | 'inventory' | 'prescription' | 'laboratory' | 'imaging' | 'user' | 'report' | 'system'
  resourceId?: string
  oldValue?: any
  newValue?: any
  ipAddress: string
  userAgent: string
  timestamp: string
  sessionId?: string
  metadata?: Record<string, any>
}

// Armazenamento em memória para auditoria (em produção seria CouchDB)
const auditLogs: AuditLog[] = []

const auditPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorator para registrar logs de auditoria
  fastify.decorate('audit', {
    log: (logData: Omit<AuditLog, '_id' | 'timestamp'>) => {
      const auditLog: AuditLog = {
        _id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...logData
      }
      
      auditLogs.push(auditLog)
      
      // Em produção, salvar no CouchDB
      // fastify.log.info('Audit log created', { auditLog })
      
      return auditLog
    },
    
    getLogs: (filters?: {
      userId?: string
      action?: string
      resource?: string
      startDate?: string
      endDate?: string
      limit?: number
    }) => {
      let filteredLogs = [...auditLogs]
      
      if (filters?.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId)
      }
      
      if (filters?.action) {
        filteredLogs = filteredLogs.filter(log => log.action === filters.action)
      }
      
      if (filters?.resource) {
        filteredLogs = filteredLogs.filter(log => log.resource === filters.resource)
      }
      
      if (filters?.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!)
      }
      
      if (filters?.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!)
      }
      
      if (filters?.limit) {
        filteredLogs = filteredLogs.slice(-filters.limit)
      }
      
      return filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    },
    
    exportLogs: (filters?: any) => {
      const logs = fastify.audit.getLogs(filters)
      return logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp).toLocaleString()
      }))
    }
  })

  // Hook para capturar automaticamente ações de CRUD
  fastify.addHook('onRequest', async (request, reply) => {
    const user = request.user as any
    
    if (user) {
      // Capturar informações da requisição
      request.auditContext = {
        userId: user.id,
        username: user.username,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || '',
        sessionId: request.headers['x-session-id'] as string
      }
    }
  })

  // Hook para registrar logs após resposta
  fastify.addHook('onResponse', async (request, reply) => {
    const user = request.user as any
    const auditContext = request.auditContext as any
    
    if (user && auditContext) {
      const method = request.method
      const url = request.url
      
      // Determinar ação baseada no método HTTP
      let action: AuditLog['action'] = 'READ'
      let resource: AuditLog['resource'] = 'system'
      
      if (method === 'POST') action = 'CREATE'
      else if (method === 'PUT' || method === 'PATCH') action = 'UPDATE'
      else if (method === 'DELETE') action = 'DELETE'
      
      // Determinar recurso baseado na URL
      if (url.includes('/patients')) resource = 'patient'
      else if (url.includes('/doctors')) resource = 'doctor'
      else if (url.includes('/appointments')) resource = 'appointment'
      else if (url.includes('/medications')) resource = 'medication'
      else if (url.includes('/inventory')) resource = 'inventory'
      else if (url.includes('/prescriptions')) resource = 'prescription'
      else if (url.includes('/laboratory')) resource = 'laboratory'
      else if (url.includes('/auth')) resource = 'user'
      else if (url.includes('/reports')) resource = 'report'
      
      // Registrar log de auditoria
      fastify.audit.log({
        userId: user.id,
        username: user.username,
        action,
        resource,
        ipAddress: auditContext.ipAddress,
        userAgent: auditContext.userAgent,
        sessionId: auditContext.sessionId,
        metadata: {
          method,
          url,
          statusCode: reply.statusCode,
          responseTime: reply.getResponseTime()
        }
      })
    }
  })
}

export default auditPlugin 