import { FastifyPluginAsync } from 'fastify'
import * as os from 'os'

interface SystemMetrics {
  cpu: number
  memory: number
  uptime: number
  requestsPerSecond: number
  errorRate: number
  systemHealth: 'healthy' | 'warning' | 'critical'
}

interface Alert {
  _id: string
  type: 'system' | 'business' | 'security' | 'performance'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  timestamp: string
  acknowledged: boolean
}

const metricsHistory: SystemMetrics[] = []
const alerts: Alert[] = []
let requestCount = 0
let errorCount = 0
let startTime = Date.now()

const monitoringPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('monitoring', {
    collectMetrics: (): SystemMetrics => {
      const cpuUsage = os.loadavg()[0] * 100
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100
      const uptime = Date.now() - startTime
      const requestsPerSecond = requestCount / (uptime / 1000)
      const errorRate = errorCount / Math.max(requestCount, 1) * 100
      
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy'
      if (cpuUsage > 90 || memoryUsage > 90) {
        systemHealth = 'critical'
      } else if (cpuUsage > 70 || memoryUsage > 70) {
        systemHealth = 'warning'
      }
      
      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        uptime,
        requestsPerSecond,
        errorRate,
        systemHealth
      }
    },
    
    createAlert: (alertData: Omit<Alert, '_id' | 'timestamp'>) => {
      const alert: Alert = {
        _id: `alert_${Date.now()}`,
        timestamp: new Date().toISOString(),
        ...alertData
      }
      
      alerts.push(alert)
      if (alerts.length > 1000) alerts.shift()
      
      fastify.log.warn(`Alert: ${alert.title}`, alert)
      return alert
    },
    
    getAlerts: (filters?: { severity?: string; acknowledged?: boolean }) => {
      let filteredAlerts = [...alerts]
      
      if (filters?.severity) {
        filteredAlerts = filteredAlerts.filter(a => a.severity === filters.severity)
      }
      
      if (filters?.acknowledged !== undefined) {
        filteredAlerts = filteredAlerts.filter(a => a.acknowledged === filters.acknowledged)
      }
      
      return filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    },
    
    getDashboard: () => {
      const currentMetrics = fastify.monitoring.collectMetrics()
      const recentAlerts = fastify.monitoring.getAlerts({ acknowledged: false })
      
      return {
        currentMetrics,
        recentAlerts,
        summary: {
          totalRequests: requestCount,
          totalErrors: errorCount,
          uptime: currentMetrics.uptime,
          systemHealth: currentMetrics.systemHealth
        }
      }
    }
  })

  fastify.addHook('onRequest', async (request, reply) => {
    requestCount++
  })

  fastify.addHook('onError', async (request, reply, error) => {
    errorCount++
    
    if (reply.statusCode >= 500) {
      fastify.monitoring.createAlert({
        type: 'system',
        severity: 'high',
        title: 'Server Error',
        message: `HTTP ${reply.statusCode} error on ${request.method} ${request.url}`,
        acknowledged: false
      })
    }
  })

  setInterval(() => {
    const metrics = fastify.monitoring.collectMetrics()
    metricsHistory.push(metrics)
    if (metricsHistory.length > 100) metricsHistory.shift()
    
    if (metrics.cpu > 90) {
      fastify.monitoring.createAlert({
        type: 'system',
        severity: 'critical',
        title: 'CPU Usage Critical',
        message: `CPU usage is at ${metrics.cpu.toFixed(2)}%`,
        acknowledged: false
      })
    }
    
    if (metrics.memory > 90) {
      fastify.monitoring.createAlert({
        type: 'system',
        severity: 'critical',
        title: 'Memory Usage Critical',
        message: `Memory usage is at ${metrics.memory.toFixed(2)}%`,
        acknowledged: false
      })
    }
  }, 30000)
}

export default monitoringPlugin 