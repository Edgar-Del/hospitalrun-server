import { FastifyPluginAsync } from 'fastify'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

interface BackupConfig {
  frequency: 'hourly' | 'daily' | 'weekly'
  retention: '7_days' | '30_days' | '1_year'
  encryption: boolean
  compression: boolean
  backupDir: string
  maxBackups: number
}

interface BackupMetadata {
  _id: string
  timestamp: string
  type: 'full' | 'incremental'
  size: number
  checksum: string
  encrypted: boolean
  compressed: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  error?: string
}

const backupPlugin: FastifyPluginAsync = async (fastify) => {
  const backupConfig: BackupConfig = {
    frequency: (process.env.BACKUP_FREQUENCY as any) || 'daily',
    retention: (process.env.BACKUP_RETENTION as any) || '30_days',
    encryption: process.env.BACKUP_ENCRYPTION === 'true',
    compression: process.env.BACKUP_COMPRESSION === 'true',
    backupDir: process.env.BACKUP_DIR || './backups',
    maxBackups: parseInt(process.env.MAX_BACKUPS || '100')
  }

  // Criar diretório de backup se não existir
  if (!fs.existsSync(backupConfig.backupDir)) {
    fs.mkdirSync(backupConfig.backupDir, { recursive: true })
  }

  const backups: BackupMetadata[] = []

  fastify.decorate('backup', {
    // Criar backup completo
    createBackup: async (): Promise<BackupMetadata> => {
      const backupId = `backup_${Date.now()}`
      const backupPath = path.join(backupConfig.backupDir, `${backupId}.json`)
      
      const metadata: BackupMetadata = {
        _id: backupId,
        timestamp: new Date().toISOString(),
        type: 'full',
        size: 0,
        checksum: '',
        encrypted: backupConfig.encryption,
        compressed: backupConfig.compression,
        status: 'pending'
      }
      
      try {
        metadata.status = 'in_progress'
        
        // Coletar dados do sistema
        const backupData = {
          timestamp: metadata.timestamp,
          version: '1.0.0',
          data: {
            users: [], // Seria obtido dos dados reais
            patients: [],
            doctors: [],
            appointments: [],
            medications: [],
            inventory: [],
            prescriptions: [],
            laboratory: []
          },
          metadata: {
            totalRecords: 0,
            backupType: 'full'
          }
        }
        
        // Serializar dados
        let backupContent = JSON.stringify(backupData, null, 2)
        
        // Comprimir se configurado
        if (backupConfig.compression) {
          // Implementar compressão (gzip)
          backupContent = backupContent // Placeholder
        }
        
        // Criptografar se configurado
        if (backupConfig.encryption) {
          const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-32-chars-long'
          const cipher = crypto.createCipher('aes-256-cbc', encryptionKey)
          let encrypted = cipher.update(backupContent, 'utf8', 'hex')
          encrypted += cipher.final('hex')
          backupContent = encrypted
        }
        
        // Calcular checksum
        const checksum = crypto.createHash('sha256').update(backupContent).digest('hex')
        
        // Salvar arquivo de backup
        fs.writeFileSync(backupPath, backupContent)
        
        // Atualizar metadata
        metadata.size = fs.statSync(backupPath).size
        metadata.checksum = checksum
        metadata.status = 'completed'
        
        // Adicionar à lista de backups
        backups.push(metadata)
        
        // Limpar backups antigos
        fastify.backup.cleanupOldBackups()
        
        fastify.log.info(`Backup created: ${backupId}`, metadata)
        
      } catch (error) {
        metadata.status = 'failed'
        metadata.error = error instanceof Error ? error.message : 'Unknown error'
        fastify.log.error(`Backup failed: ${backupId}`, error)
      }
      
      return metadata
    },
    
    // Restaurar backup
    restoreBackup: async (backupId: string): Promise<boolean> => {
      try {
        const backup = backups.find(b => b._id === backupId)
        if (!backup) {
          throw new Error('Backup not found')
        }
        
        const backupPath = path.join(backupConfig.backupDir, `${backupId}.json`)
        
        if (!fs.existsSync(backupPath)) {
          throw new Error('Backup file not found')
        }
        
        // Ler arquivo de backup
        let backupContent = fs.readFileSync(backupPath, 'utf8')
        
        // Descriptografar se necessário
        if (backup.encrypted) {
          const encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || 'default-key-32-chars-long'
          const decipher = crypto.createDecipher('aes-256-cbc', encryptionKey)
          let decrypted = decipher.update(backupContent, 'hex', 'utf8')
          decrypted += decipher.final('utf8')
          backupContent = decrypted
        }
        
        // Descomprimir se necessário
        if (backup.compressed) {
          // Implementar descompressão
        }
        
        // Verificar checksum
        const checksum = crypto.createHash('sha256').update(backupContent).digest('hex')
        if (checksum !== backup.checksum) {
          throw new Error('Backup checksum verification failed')
        }
        
        // Parsear dados
        const backupData = JSON.parse(backupContent)
        
        // Restaurar dados (implementação específica)
        fastify.log.info(`Restoring backup: ${backupId}`, backupData)
        
        return true
        
      } catch (error) {
        fastify.log.error(`Restore failed: ${backupId}`, error)
        return false
      }
    },
    
    // Listar backups
    listBackups: (): BackupMetadata[] => {
      return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    },
    
    // Obter backup específico
    getBackup: (backupId: string): BackupMetadata | null => {
      return backups.find(b => b._id === backupId) || null
    },
    
    // Limpar backups antigos
    cleanupOldBackups: () => {
      const now = Date.now()
      const retentionMs = {
        '7_days': 7 * 24 * 60 * 60 * 1000,
        '30_days': 30 * 24 * 60 * 60 * 1000,
        '1_year': 365 * 24 * 60 * 60 * 1000
      }[backupConfig.retention] || 30 * 24 * 60 * 60 * 1000
      
      // Remover backups antigos
      const oldBackups = backups.filter(b => 
        now - new Date(b.timestamp).getTime() > retentionMs
      )
      
      for (const backup of oldBackups) {
        const backupPath = path.join(backupConfig.backupDir, `${backup._id}.json`)
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath)
        }
      }
      
      // Remover da lista
      const backupIdsToRemove = oldBackups.map(b => b._id)
      const index = backups.findIndex(b => backupIdsToRemove.includes(b._id))
      if (index > -1) {
        backups.splice(index, 1)
      }
      
      // Limitar número máximo de backups
      if (backups.length > backupConfig.maxBackups) {
        const excessBackups = backups.slice(backupConfig.maxBackups)
        for (const backup of excessBackups) {
          const backupPath = path.join(backupConfig.backupDir, `${backup._id}.json`)
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath)
          }
        }
        backups.splice(backupConfig.maxBackups)
      }
    },
    
    // Verificar integridade do backup
    verifyBackup: (backupId: string): boolean => {
      try {
        const backup = backups.find(b => b._id === backupId)
        if (!backup) return false
        
        const backupPath = path.join(backupConfig.backupDir, `${backupId}.json`)
        if (!fs.existsSync(backupPath)) return false
        
        const backupContent = fs.readFileSync(backupPath, 'utf8')
        const checksum = crypto.createHash('sha256').update(backupContent).digest('hex')
        
        return checksum === backup.checksum
      } catch (error) {
        return false
      }
    },
    
    // Configurações de backup
    getConfig: (): BackupConfig => backupConfig,
    
    // Estatísticas de backup
    getStats: () => {
      const totalBackups = backups.length
      const successfulBackups = backups.filter(b => b.status === 'completed').length
      const failedBackups = backups.filter(b => b.status === 'failed').length
      const totalSize = backups.reduce((sum, b) => sum + b.size, 0)
      
      return {
        totalBackups,
        successfulBackups,
        failedBackups,
        totalSize,
        lastBackup: backups[0]?.timestamp || null,
        config: backupConfig
      }
    }
  })

  // Agendar backups automáticos
  const scheduleBackup = () => {
    const intervals = {
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    }
    
    const interval = intervals[backupConfig.frequency] || intervals.daily
    
    setInterval(async () => {
      fastify.log.info('Starting scheduled backup...')
      await fastify.backup.createBackup()
    }, interval)
  }

  // Iniciar agendamento de backups
  scheduleBackup()
}

export default backupPlugin 