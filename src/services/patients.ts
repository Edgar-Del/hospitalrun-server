import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { v4 as uuidv4 } from 'uuid'

interface Patient {
  _id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  phone: string
  email?: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  medicalHistory: string[]
  allergies: string[]
  currentMedications: string[]
  insurance: {
    provider: string
    policyNumber: string
    groupNumber?: string
  }
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface CreatePatientRequest {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  phone: string
  email?: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  medicalHistory?: string[]
  allergies?: string[]
  currentMedications?: string[]
  insurance: {
    provider: string
    policyNumber: string
    groupNumber?: string
  }
}

interface UpdatePatientRequest extends Partial<CreatePatientRequest> {
  _id: string
}

// Simulação de banco de dados em memória
const patients: Patient[] = []

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // Criar paciente
  fastify.post('/patients', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const patientData = request.body as CreatePatientRequest
    const user = request.user!

    const newPatient: Patient = {
      _id: uuidv4(),
      ...patientData,
      medicalHistory: patientData.medicalHistory || [],
      allergies: patientData.allergies || [],
      currentMedications: patientData.currentMedications || [],
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    patients.push(newPatient)

    reply.code(201).send({ patient: newPatient })
  })

  // Listar pacientes
  fastify.get('/patients', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const user = request.user!
    const { page = 1, limit = 10, search } = request.query as any

    let filteredPatients = patients.filter(p => 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    // Busca por nome
    if (search) {
      const searchLower = search.toLowerCase()
      filteredPatients = filteredPatients.filter(p =>
        p.firstName.toLowerCase().includes(searchLower) ||
        p.lastName.toLowerCase().includes(searchLower)
      )
    }

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedPatients = filteredPatients.slice(startIndex, endIndex)

    reply.send({
      patients: paginatedPatients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredPatients.length,
        totalPages: Math.ceil(filteredPatients.length / limit),
      },
    })
  })

  // Buscar paciente por ID
  fastify.get('/patients/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const patient = patients.find(p => 
      p._id === id && 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    if (!patient) {
      return reply.code(404).send({ error: 'Paciente não encontrado' })
    }

    reply.send({ patient })
  })

  // Atualizar paciente
  fastify.put('/patients/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const updateData = request.body as UpdatePatientRequest
    const user = request.user!

    const patientIndex = patients.findIndex(p => 
      p._id === id && 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    if (patientIndex === -1) {
      return reply.code(404).send({ error: 'Paciente não encontrado' })
    }

    const updatedPatient = {
      ...patients[patientIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    }

    patients[patientIndex] = updatedPatient

    reply.send({ patient: updatedPatient })
  })

  // Deletar paciente
  fastify.delete('/patients/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const patientIndex = patients.findIndex(p => 
      p._id === id && 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    if (patientIndex === -1) {
      return reply.code(404).send({ error: 'Paciente não encontrado' })
    }

    const deletedPatient = patients.splice(patientIndex, 1)[0]

    reply.send({ message: 'Paciente deletado com sucesso', patient: deletedPatient })
  })

  // Buscar pacientes por médico
  fastify.get('/patients/doctor/:doctorId', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const { doctorId } = request.params as { doctorId: string }
    const user = request.user!

    // Em uma implementação real, você teria uma relação entre médicos e pacientes
    const doctorPatients = patients.filter(p => 
      p.hospitalId === user.hospitalId && 
      p.organizationId === user.organizationId
    )

    reply.send({ patients: doctorPatients })
  })

  next()
} 