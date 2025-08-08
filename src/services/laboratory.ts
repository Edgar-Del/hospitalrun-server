import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { v4 as uuidv4 } from 'uuid'

interface LaboratoryTest {
  _id: string
  name: string
  code: string
  category: 'blood' | 'urine' | 'stool' | 'tissue' | 'culture' | 'imaging' | 'cardiology' | 'neurology'
  type: 'laboratory' | 'imaging' | 'specialized'
  description: string
  preparation: string
  duration: number
  price: number
  requiresFasting: boolean
  normalRange: {
    min: number
    max: number
    unit: string
  }
  hospitalId: string
  organizationId: string
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

interface LaboratoryOrder {
  _id: string
  patientId: string
  doctorId: string
  tests: {
    testId: string
    priority: 'routine' | 'urgent' | 'emergency'
    notes?: string
  }[]
  status: 'ordered' | 'in_progress' | 'completed' | 'cancelled'
  orderedDate: string
  scheduledDate?: string
  completedDate?: string
  totalPrice: number
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface ImagingStudy {
  _id: string
  patientId: string
  doctorId: string
  studyType: 'xray' | 'ct' | 'mri' | 'ultrasound' | 'endoscopy' | 'colonoscopy' | 'mammography'
  bodyPart: string
  description: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  scheduledDate: string
  completedDate?: string
  findings: string
  impression: string
  images: string[]
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

// Simulação de banco de dados em memória
const laboratoryTests: LaboratoryTest[] = []
const laboratoryOrders: LaboratoryOrder[] = []
const imagingStudies: ImagingStudy[] = []

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // Criar teste laboratorial
  fastify.post('/laboratory/tests', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const testData = request.body as any
    const user = request.user!

    const newTest: LaboratoryTest = {
      _id: uuidv4(),
      ...testData,
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    laboratoryTests.push(newTest)
    reply.code(201).send({ test: newTest })
  })

  // Listar testes laboratoriais
  fastify.get('/laboratory/tests', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const user = request.user!
    const { category, type } = request.query as any

    let filteredTests = laboratoryTests.filter(t => 
      t.hospitalId === user.hospitalId && 
      t.organizationId === user.organizationId
    )

    if (category) {
      filteredTests = filteredTests.filter(t => t.category === category)
    }
    if (type) {
      filteredTests = filteredTests.filter(t => t.type === type)
    }

    reply.send({ tests: filteredTests })
  })

  // Criar pedido laboratorial
  fastify.post('/laboratory/orders', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const orderData = request.body as any
    const user = request.user!

    let totalPrice = 0
    for (const testItem of orderData.tests) {
      const test = laboratoryTests.find(t => t._id === testItem.testId)
      if (test) {
        totalPrice += test.price
      }
    }

    const newOrder: LaboratoryOrder = {
      _id: uuidv4(),
      ...orderData,
      status: 'ordered',
      orderedDate: new Date().toISOString(),
      totalPrice,
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    laboratoryOrders.push(newOrder)
    reply.code(201).send({ order: newOrder })
  })

  // Listar pedidos laboratoriais
  fastify.get('/laboratory/orders', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const user = request.user!
    const { patientId, status } = request.query as any

    let filteredOrders = laboratoryOrders.filter(o => 
      o.hospitalId === user.hospitalId && 
      o.organizationId === user.organizationId
    )

    if (patientId) {
      filteredOrders = filteredOrders.filter(o => o.patientId === patientId)
    }
    if (status) {
      filteredOrders = filteredOrders.filter(o => o.status === status)
    }

    reply.send({ orders: filteredOrders })
  })

  // Criar estudo de imagiologia
  fastify.post('/laboratory/imaging', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const studyData = request.body as any
    const user = request.user!

    const newStudy: ImagingStudy = {
      _id: uuidv4(),
      ...studyData,
      status: 'scheduled',
      images: [],
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    imagingStudies.push(newStudy)
    reply.code(201).send({ study: newStudy })
  })

  // Listar estudos de imagiologia
  fastify.get('/laboratory/imaging', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const user = request.user!
    const { patientId, studyType, status } = request.query as any

    let filteredStudies = imagingStudies.filter(s => 
      s.hospitalId === user.hospitalId && 
      s.organizationId === user.organizationId
    )

    if (patientId) {
      filteredStudies = filteredStudies.filter(s => s.patientId === patientId)
    }
    if (studyType) {
      filteredStudies = filteredStudies.filter(s => s.studyType === studyType)
    }
    if (status) {
      filteredStudies = filteredStudies.filter(s => s.status === status)
    }

    reply.send({ studies: filteredStudies })
  })

  // Atualizar status do pedido
  fastify.put('/laboratory/orders/:id/status', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: 'ordered' | 'in_progress' | 'completed' | 'cancelled' }
    const user = request.user!

    const orderIndex = laboratoryOrders.findIndex(o => 
      o._id === id && 
      o.hospitalId === user.hospitalId && 
      o.organizationId === user.organizationId
    )

    if (orderIndex === -1) {
      return reply.code(404).send({ error: 'Pedido não encontrado' })
    }

    laboratoryOrders[orderIndex].status = status
    laboratoryOrders[orderIndex].updatedAt = new Date().toISOString()

    if (status === 'completed') {
      laboratoryOrders[orderIndex].completedDate = new Date().toISOString()
    }

    reply.send({ order: laboratoryOrders[orderIndex] })
  })

  // Adicionar relatório de imagiologia
  fastify.put('/laboratory/imaging/:id/report', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { findings, impression } = request.body as any
    const user = request.user!

    const studyIndex = imagingStudies.findIndex(s => 
      s._id === id && 
      s.hospitalId === user.hospitalId && 
      s.organizationId === user.organizationId
    )

    if (studyIndex === -1) {
      return reply.code(404).send({ error: 'Estudo não encontrado' })
    }

    imagingStudies[studyIndex].findings = findings
    imagingStudies[studyIndex].impression = impression
    imagingStudies[studyIndex].updatedAt = new Date().toISOString()

    reply.send({ study: imagingStudies[studyIndex] })
  })

  next()
} 