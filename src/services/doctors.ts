import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { v4 as uuidv4 } from 'uuid'

interface Doctor {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  specialization: string
  licenseNumber: string
  experience: number // anos de experiência
  education: {
    degree: string
    institution: string
    year: number
  }[]
  certifications: string[]
  languages: string[]
  availability: {
    monday: { start: string; end: string; available: boolean }
    tuesday: { start: string; end: string; available: boolean }
    wednesday: { start: string; end: string; available: boolean }
    thursday: { start: string; end: string; available: boolean }
    friday: { start: string; end: string; available: boolean }
    saturday: { start: string; end: string; available: boolean }
    sunday: { start: string; end: string; available: boolean }
  }
  consultationFee: number
  hospitalId: string
  organizationId: string
  status: 'active' | 'inactive' | 'on_leave'
  createdAt: string
  updatedAt: string
}

interface CreateDoctorRequest {
  firstName: string
  lastName: string
  email: string
  phone: string
  specialization: string
  licenseNumber: string
  experience: number
  education: {
    degree: string
    institution: string
    year: number
  }[]
  certifications?: string[]
  languages?: string[]
  availability?: {
    monday: { start: string; end: string; available: boolean }
    tuesday: { start: string; end: string; available: boolean }
    wednesday: { start: string; end: string; available: boolean }
    thursday: { start: string; end: string; available: boolean }
    friday: { start: string; end: string; available: boolean }
    saturday: { start: string; end: string; available: boolean }
    sunday: { start: string; end: string; available: boolean }
  }
  consultationFee: number
}

interface UpdateDoctorRequest extends Partial<CreateDoctorRequest> {
  _id: string
}

// Simulação de banco de dados em memória
const doctors: Doctor[] = []

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // Criar médico
  fastify.post('/doctors', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const doctorData = request.body as CreateDoctorRequest
    const user = request.user!

    const newDoctor: Doctor = {
      _id: uuidv4(),
      ...doctorData,
      certifications: doctorData.certifications || [],
      languages: doctorData.languages || ['Portuguese'],
      availability: doctorData.availability || {
        monday: { start: '09:00', end: '17:00', available: true },
        tuesday: { start: '09:00', end: '17:00', available: true },
        wednesday: { start: '09:00', end: '17:00', available: true },
        thursday: { start: '09:00', end: '17:00', available: true },
        friday: { start: '09:00', end: '17:00', available: true },
        saturday: { start: '09:00', end: '13:00', available: false },
        sunday: { start: '09:00', end: '13:00', available: false },
      },
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    doctors.push(newDoctor)

    reply.code(201).send({ doctor: newDoctor })
  })

  // Listar médicos
  fastify.get('/doctors', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const user = request.user!
    const { page = 1, limit = 10, specialization, status } = request.query as any

    let filteredDoctors = doctors.filter(d => 
      d.hospitalId === user.hospitalId && 
      d.organizationId === user.organizationId
    )

    // Filtro por especialidade
    if (specialization) {
      filteredDoctors = filteredDoctors.filter(d =>
        d.specialization.toLowerCase().includes(specialization.toLowerCase())
      )
    }

    // Filtro por status
    if (status) {
      filteredDoctors = filteredDoctors.filter(d => d.status === status)
    }

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex)

    reply.send({
      doctors: paginatedDoctors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredDoctors.length,
        totalPages: Math.ceil(filteredDoctors.length / limit),
      },
    })
  })

  // Buscar médico por ID
  fastify.get('/doctors/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const doctor = doctors.find(d => 
      d._id === id && 
      d.hospitalId === user.hospitalId && 
      d.organizationId === user.organizationId
    )

    if (!doctor) {
      return reply.code(404).send({ error: 'Médico não encontrado' })
    }

    reply.send({ doctor })
  })

  // Atualizar médico
  fastify.put('/doctors/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const updateData = request.body as UpdateDoctorRequest
    const user = request.user!

    const doctorIndex = doctors.findIndex(d => 
      d._id === id && 
      d.hospitalId === user.hospitalId && 
      d.organizationId === user.organizationId
    )

    if (doctorIndex === -1) {
      return reply.code(404).send({ error: 'Médico não encontrado' })
    }

    const updatedDoctor = {
      ...doctors[doctorIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    }

    doctors[doctorIndex] = updatedDoctor

    reply.send({ doctor: updatedDoctor })
  })

  // Deletar médico
  fastify.delete('/doctors/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const doctorIndex = doctors.findIndex(d => 
      d._id === id && 
      d.hospitalId === user.hospitalId && 
      d.organizationId === user.organizationId
    )

    if (doctorIndex === -1) {
      return reply.code(404).send({ error: 'Médico não encontrado' })
    }

    const deletedDoctor = doctors.splice(doctorIndex, 1)[0]

    reply.send({ message: 'Médico deletado com sucesso', doctor: deletedDoctor })
  })

  // Buscar médicos por especialidade
  fastify.get('/doctors/specialization/:specialization', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const { specialization } = request.params as { specialization: string }
    const user = request.user!

    const specializedDoctors = doctors.filter(d => 
      d.hospitalId === user.hospitalId && 
      d.organizationId === user.organizationId &&
      d.specialization.toLowerCase().includes(specialization.toLowerCase()) &&
      d.status === 'active'
    )

    reply.send({ doctors: specializedDoctors })
  })

  // Atualizar disponibilidade do médico
  fastify.put('/doctors/:id/availability', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { availability } = request.body as { availability: Doctor['availability'] }
    const user = request.user!

    const doctorIndex = doctors.findIndex(d => 
      d._id === id && 
      d.hospitalId === user.hospitalId && 
      d.organizationId === user.organizationId
    )

    if (doctorIndex === -1) {
      return reply.code(404).send({ error: 'Médico não encontrado' })
    }

    doctors[doctorIndex].availability = availability
    doctors[doctorIndex].updatedAt = new Date().toISOString()

    reply.send({ doctor: doctors[doctorIndex] })
  })

  next()
} 