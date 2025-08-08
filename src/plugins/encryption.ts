import { FastifyPluginAsync } from 'fastify'
import * as crypto from 'crypto'

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm'
  keyLength: 32
  ivLength: 16
  tagLength: 16
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-super-secret-encryption-key-32-chars'
const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

const encryptionPlugin: FastifyPluginAsync = async (fastify) => {
  // Decorator para criptografia
  fastify.decorate('encryption', {
    // Criptografar dados sensíveis
    encrypt: (text: string): string => {
      try {
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY)
        
        let encrypted = cipher.update(text, 'utf8', 'hex')
        encrypted += cipher.final('hex')
        
        const authTag = cipher.getAuthTag()
        
        // Retornar IV + AuthTag + Dados Criptografados
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
      } catch (error) {
        fastify.log.error('Erro na criptografia:', error)
        throw new Error('Falha na criptografia dos dados')
      }
    },
    
    // Descriptografar dados sensíveis
    decrypt: (encryptedData: string): string => {
      try {
        const parts = encryptedData.split(':')
        if (parts.length !== 3) {
          throw new Error('Formato de dados criptografados inválido')
        }
        
        const iv = Buffer.from(parts[0], 'hex')
        const authTag = Buffer.from(parts[1], 'hex')
        const encrypted = parts[2]
        
        const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY)
        decipher.setAuthTag(authTag)
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        
        return decrypted
      } catch (error) {
        fastify.log.error('Erro na descriptografia:', error)
        throw new Error('Falha na descriptografia dos dados')
      }
    },
    
    // Criptografar objeto com campos sensíveis
    encryptObject: (obj: any, sensitiveFields: string[]): any => {
      const encryptedObj = { ...obj }
      
      for (const field of sensitiveFields) {
        if (encryptedObj[field] && typeof encryptedObj[field] === 'string') {
          encryptedObj[field] = fastify.encryption.encrypt(encryptedObj[field])
        }
      }
      
      return encryptedObj
    },
    
    // Descriptografar objeto com campos sensíveis
    decryptObject: (obj: any, sensitiveFields: string[]): any => {
      const decryptedObj = { ...obj }
      
      for (const field of sensitiveFields) {
        if (decryptedObj[field] && typeof decryptedObj[field] === 'string') {
          try {
            decryptedObj[field] = fastify.encryption.decrypt(decryptedObj[field])
          } catch (error) {
            fastify.log.warn(`Falha ao descriptografar campo ${field}:`, error)
            // Manter o valor criptografado se falhar
          }
        }
      }
      
      return decryptedObj
    },
    
    // Hash seguro para senhas
    hashPassword: (password: string): string => {
      const salt = crypto.randomBytes(16).toString('hex')
      const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
      return `${salt}:${hash}`
    },
    
    // Verificar senha
    verifyPassword: (password: string, hashedPassword: string): boolean => {
      const [salt, hash] = hashedPassword.split(':')
      const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex')
      return hash === verifyHash
    },
    
    // Gerar token seguro
    generateSecureToken: (length: number = 32): string => {
      return crypto.randomBytes(length).toString('hex')
    }
  })
  
  // Hook para criptografar dados sensíveis automaticamente
  fastify.addHook('preHandler', async (request, reply) => {
    // Definir campos sensíveis por recurso
    const sensitiveFieldsMap: Record<string, string[]> = {
      patients: ['ssn', 'medicalHistory', 'insuranceDetails', 'emergencyContact'],
      doctors: ['licenseNumber', 'specialization'],
      appointments: ['notes', 'diagnosis'],
      prescriptions: ['instructions', 'diagnosis'],
      laboratory: ['results', 'notes'],
      users: ['password', 'email']
    }
    
    const resource = request.url.split('/')[1] // ex: /patients -> patients
    const sensitiveFields = sensitiveFieldsMap[resource] || []
    
    if (sensitiveFields.length > 0 && request.body) {
      request.body = fastify.encryption.encryptObject(request.body, sensitiveFields)
    }
  })
  
  // Hook para descriptografar dados sensíveis na resposta
  fastify.addHook('onSend', async (request, reply, payload) => {
    const resource = request.url.split('/')[1]
    const sensitiveFieldsMap: Record<string, string[]> = {
      patients: ['ssn', 'medicalHistory', 'insuranceDetails', 'emergencyContact'],
      doctors: ['licenseNumber', 'specialization'],
      appointments: ['notes', 'diagnosis'],
      prescriptions: ['instructions', 'diagnosis'],
      laboratory: ['results', 'notes']
    }
    
    const sensitiveFields = sensitiveFieldsMap[resource] || []
    
    if (sensitiveFields.length > 0 && payload) {
      try {
        const parsedPayload = JSON.parse(payload.toString())
        
        if (Array.isArray(parsedPayload)) {
          // Array de objetos
          const decryptedArray = parsedPayload.map(item => 
            fastify.encryption.decryptObject(item, sensitiveFields)
          )
          reply.send(decryptedArray)
        } else {
          // Objeto único
          const decryptedObject = fastify.encryption.decryptObject(parsedPayload, sensitiveFields)
          reply.send(decryptedObject)
        }
      } catch (error) {
        // Se não for JSON válido, enviar payload original
        reply.send(payload)
      }
    }
  })
}

export default encryptionPlugin 