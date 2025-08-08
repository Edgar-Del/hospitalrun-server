import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { v4 as uuidv4 } from 'uuid'

interface Medication {
  _id: string
  name: string
  genericName: string
  category: 'antibiotic' | 'analgesic' | 'antihypertensive' | 'diabetic' | 'psychiatric' | 'other'
  dosageForm: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'cream' | 'drops' | 'inhaler'
  strength: string // ex: "500mg", "10mg/ml"
  manufacturer: string
  description: string
  sideEffects: string[]
  contraindications: string[]
  interactions: string[]
  storageConditions: string
  prescriptionRequired: boolean
  controlledSubstance: boolean
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface Inventory {
  _id: string
  medicationId: string
  batchNumber: string
  quantity: number
  unit: 'tablets' | 'capsules' | 'bottles' | 'tubes' | 'vials'
  expiryDate: string
  purchaseDate: string
  purchasePrice: number
  supplier: string
  location: string // localização no hospital
  status: 'available' | 'low_stock' | 'expired' | 'recalled'
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface Prescription {
  _id: string
  patientId: string
  doctorId: string
  appointmentId?: string
  medications: {
    medicationId: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
    quantity: number
  }[]
  diagnosis: string
  notes?: string
  status: 'active' | 'completed' | 'cancelled'
  prescribedDate: string
  expiryDate: string
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface CreateMedicationRequest {
  name: string
  genericName: string
  category: 'antibiotic' | 'analgesic' | 'antihypertensive' | 'diabetic' | 'psychiatric' | 'other'
  dosageForm: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'cream' | 'drops' | 'inhaler'
  strength: string
  manufacturer: string
  description: string
  sideEffects?: string[]
  contraindications?: string[]
  interactions?: string[]
  storageConditions: string
  prescriptionRequired: boolean
  controlledSubstance: boolean
}

interface CreateInventoryRequest {
  medicationId: string
  batchNumber: string
  quantity: number
  unit: 'tablets' | 'capsules' | 'bottles' | 'tubes' | 'vials'
  expiryDate: string
  purchaseDate: string
  purchasePrice: number
  supplier: string
  location: string
}

interface CreatePrescriptionRequest {
  patientId: string
  doctorId: string
  appointmentId?: string
  medications: {
    medicationId: string
    dosage: string
    frequency: string
    duration: string
    instructions: string
    quantity: number
  }[]
  diagnosis: string
  notes?: string
}

// Simulação de banco de dados em memória
const medications: Medication[] = []
const inventory: Inventory[] = []
const prescriptions: Prescription[] = []

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // ===== MEDICAMENTOS =====

  // Criar medicamento
  fastify.post('/medications', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const medicationData = request.body as CreateMedicationRequest
    const user = request.user!

    const newMedication: Medication = {
      _id: uuidv4(),
      ...medicationData,
      sideEffects: medicationData.sideEffects || [],
      contraindications: medicationData.contraindications || [],
      interactions: medicationData.interactions || [],
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    medications.push(newMedication)

    reply.code(201).send({ medication: newMedication })
  })

  // Listar medicamentos
  fastify.get('/medications', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'pharmacist'])],
  }, async (request, reply) => {
    const user = request.user!
    const { page = 1, limit = 10, category, search } = request.query as any

    let filteredMedications = medications.filter(m => 
      m.hospitalId === user.hospitalId && 
      m.organizationId === user.organizationId
    )

    // Filtro por categoria
    if (category) {
      filteredMedications = filteredMedications.filter(m => m.category === category)
    }

    // Busca por nome
    if (search) {
      const searchLower = search.toLowerCase()
      filteredMedications = filteredMedications.filter(m =>
        m.name.toLowerCase().includes(searchLower) ||
        m.genericName.toLowerCase().includes(searchLower)
      )
    }

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedMedications = filteredMedications.slice(startIndex, endIndex)

    reply.send({
      medications: paginatedMedications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredMedications.length,
        totalPages: Math.ceil(filteredMedications.length / limit),
      },
    })
  })

  // Buscar medicamento por ID
  fastify.get('/medications/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'pharmacist'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const medication = medications.find(m => 
      m._id === id && 
      m.hospitalId === user.hospitalId && 
      m.organizationId === user.organizationId
    )

    if (!medication) {
      return reply.code(404).send({ error: 'Medicamento não encontrado' })
    }

    reply.send({ medication })
  })

  // ===== INVENTÁRIO =====

  // Adicionar ao inventário
  fastify.post('/inventory', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'pharmacist'])],
  }, async (request, reply) => {
    const inventoryData = request.body as CreateInventoryRequest
    const user = request.user!

    const newInventory: Inventory = {
      _id: uuidv4(),
      ...inventoryData,
      status: 'available',
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    inventory.push(newInventory)

    reply.code(201).send({ inventory: newInventory })
  })

  // Listar inventário
  fastify.get('/inventory', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'pharmacist'])],
  }, async (request, reply) => {
    const user = request.user!
    const { medicationId, status, location } = request.query as any

    let filteredInventory = inventory.filter(i => 
      i.hospitalId === user.hospitalId && 
      i.organizationId === user.organizationId
    )

    // Filtros
    if (medicationId) {
      filteredInventory = filteredInventory.filter(i => i.medicationId === medicationId)
    }
    if (status) {
      filteredInventory = filteredInventory.filter(i => i.status === status)
    }
    if (location) {
      filteredInventory = filteredInventory.filter(i => i.location === location)
    }

    // Adicionar informações do medicamento
    const inventoryWithMedication = filteredInventory.map(item => {
      const medication = medications.find(m => m._id === item.medicationId)
      return {
        ...item,
        medication: medication || null,
      }
    })

    reply.send({ inventory: inventoryWithMedication })
  })

  // Atualizar quantidade no inventário
  fastify.put('/inventory/:id/quantity', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'pharmacist'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { quantity } = request.body as { quantity: number }
    const user = request.user!

    const inventoryIndex = inventory.findIndex(i => 
      i._id === id && 
      i.hospitalId === user.hospitalId && 
      i.organizationId === user.organizationId
    )

    if (inventoryIndex === -1) {
      return reply.code(404).send({ error: 'Item do inventário não encontrado' })
    }

    inventory[inventoryIndex].quantity = quantity
    inventory[inventoryIndex].updatedAt = new Date().toISOString()

    // Atualizar status baseado na quantidade
    if (quantity <= 10) {
      inventory[inventoryIndex].status = 'low_stock'
    } else if (quantity === 0) {
      inventory[inventoryIndex].status = 'available'
    }

    reply.send({ inventory: inventory[inventoryIndex] })
  })

  // ===== PRESCRIÇÕES =====

  // Criar prescrição
  fastify.post('/prescriptions', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const prescriptionData = request.body as CreatePrescriptionRequest
    const user = request.user!

    const newPrescription: Prescription = {
      _id: uuidv4(),
      ...prescriptionData,
      status: 'active',
      prescribedDate: new Date().toISOString(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    prescriptions.push(newPrescription)

    reply.code(201).send({ prescription: newPrescription })
  })

  // Listar prescrições
  fastify.get('/prescriptions', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'pharmacist'])],
  }, async (request, reply) => {
    const user = request.user!
    const { patientId, doctorId, status } = request.query as any

    let filteredPrescriptions = prescriptions.filter(p => 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    // Filtros
    if (patientId) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.patientId === patientId)
    }
    if (doctorId) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.doctorId === doctorId)
    }
    if (status) {
      filteredPrescriptions = filteredPrescriptions.filter(p => p.status === status)
    }

    // Adicionar informações dos medicamentos
    const prescriptionsWithMedications = filteredPrescriptions.map(prescription => {
      const medicationsWithDetails = prescription.medications.map(med => {
        const medication = medications.find(m => m._id === med.medicationId)
        return {
          ...med,
          medication: medication || null,
        }
      })

      return {
        ...prescription,
        medications: medicationsWithDetails,
      }
    })

    reply.send({ prescriptions: prescriptionsWithMedications })
  })

  // Buscar prescrição por ID
  fastify.get('/prescriptions/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'pharmacist'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const prescription = prescriptions.find(p => 
      p._id === id && 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    if (!prescription) {
      return reply.code(404).send({ error: 'Prescrição não encontrada' })
    }

    // Adicionar informações dos medicamentos
    const medicationsWithDetails = prescription.medications.map(med => {
      const medication = medications.find(m => m._id === med.medicationId)
      return {
        ...med,
        medication: medication || null,
      }
    })

    const prescriptionWithMedications = {
      ...prescription,
      medications: medicationsWithDetails,
    }

    reply.send({ prescription: prescriptionWithMedications })
  })

  // Atualizar status da prescrição
  fastify.put('/prescriptions/:id/status', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'pharmacist'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: 'active' | 'completed' | 'cancelled' }
    const user = request.user!

    const prescriptionIndex = prescriptions.findIndex(p => 
      p._id === id && 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    if (prescriptionIndex === -1) {
      return reply.code(404).send({ error: 'Prescrição não encontrada' })
    }

    prescriptions[prescriptionIndex].status = status
    prescriptions[prescriptionIndex].updatedAt = new Date().toISOString()

    reply.send({ prescription: prescriptions[prescriptionIndex] })
  })

  // Buscar prescrições por paciente
  fastify.get('/prescriptions/patient/:patientId', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'pharmacist'])],
  }, async (request, reply) => {
    const { patientId } = request.params as { patientId: string }
    const user = request.user!

    const patientPrescriptions = prescriptions.filter(p => 
      p.patientId === patientId &&
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    // Adicionar informações dos medicamentos
    const prescriptionsWithMedications = patientPrescriptions.map(prescription => {
      const medicationsWithDetails = prescription.medications.map(med => {
        const medication = medications.find(m => m._id === med.medicationId)
        return {
          ...med,
          medication: medication || null,
        }
      })

      return {
        ...prescription,
        medications: medicationsWithDetails,
      }
    })

    reply.send({ prescriptions: prescriptionsWithMedications })
  })

  next()
} 