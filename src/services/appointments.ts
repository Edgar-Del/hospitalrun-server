import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'
import { v4 as uuidv4 } from 'uuid'

interface Appointment {
  _id: string
  patientId: string
  doctorId: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  duration: number // minutos
  type: 'consultation' | 'follow_up' | 'emergency' | 'surgery' | 'examination'
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  symptoms?: string
  diagnosis?: string
  prescription?: string[]
  hospitalId: string
  organizationId: string
  createdAt: string
  updatedAt: string
}

interface CreateAppointmentRequest {
  patientId: string
  doctorId: string
  date: string
  time: string
  duration?: number
  type: 'consultation' | 'follow_up' | 'emergency' | 'surgery' | 'examination'
  notes?: string
  symptoms?: string
}

interface UpdateAppointmentRequest extends Partial<CreateAppointmentRequest> {
  _id: string
  status?: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  diagnosis?: string
  prescription?: string[]
}

// Simulação de banco de dados em memória
const appointments: Appointment[] = []

// Função para verificar conflitos de horário
function hasTimeConflict(
  doctorId: string,
  date: string,
  time: string,
  duration: number,
  excludeAppointmentId?: string
): boolean {
  const appointmentTime = new Date(`${date}T${time}`)
  const appointmentEnd = new Date(appointmentTime.getTime() + duration * 60000)

  return appointments.some(appointment => {
    if (appointment._id === excludeAppointmentId) return false
    if (appointment.doctorId !== doctorId || appointment.date !== date) return false
    if (appointment.status === 'cancelled' || appointment.status === 'no_show') return false

    const existingTime = new Date(`${appointment.date}T${appointment.time}`)
    const existingEnd = new Date(existingTime.getTime() + appointment.duration * 60000)

    return (
      (appointmentTime >= existingTime && appointmentTime < existingEnd) ||
      (appointmentEnd > existingTime && appointmentEnd <= existingEnd) ||
      (appointmentTime <= existingTime && appointmentEnd >= existingEnd)
    )
  })
}

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // Criar agendamento
  fastify.post('/appointments', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const appointmentData = request.body as CreateAppointmentRequest
    const user = request.user!

    // Verificar conflitos de horário
    if (hasTimeConflict(
      appointmentData.doctorId,
      appointmentData.date,
      appointmentData.time,
      appointmentData.duration || 30
    )) {
      return reply.code(409).send({ error: 'Conflito de horário detectado' })
    }

    const newAppointment: Appointment = {
      _id: uuidv4(),
      ...appointmentData,
      duration: appointmentData.duration || 30,
      status: 'scheduled',
      hospitalId: user.hospitalId,
      organizationId: user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    appointments.push(newAppointment)

    reply.code(201).send({ appointment: newAppointment })
  })

  // Listar agendamentos
  fastify.get('/appointments', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const user = request.user!
    const { 
      page = 1, 
      limit = 10, 
      date, 
      doctorId, 
      patientId, 
      status 
    } = request.query as any

    let filteredAppointments = appointments.filter(a => 
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    // Filtros
    if (date) {
      filteredAppointments = filteredAppointments.filter(a => a.date === date)
    }
    if (doctorId) {
      filteredAppointments = filteredAppointments.filter(a => a.doctorId === doctorId)
    }
    if (patientId) {
      filteredAppointments = filteredAppointments.filter(a => a.patientId === patientId)
    }
    if (status) {
      filteredAppointments = filteredAppointments.filter(a => a.status === status)
    }

    // Ordenar por data e hora
    filteredAppointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })

    // Paginação
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex)

    reply.send({
      appointments: paginatedAppointments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredAppointments.length,
        totalPages: Math.ceil(filteredAppointments.length / limit),
      },
    })
  })

  // Buscar agendamento por ID
  fastify.get('/appointments/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const appointment = appointments.find(a => 
      a._id === id && 
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    if (!appointment) {
      return reply.code(404).send({ error: 'Agendamento não encontrado' })
    }

    reply.send({ appointment })
  })

  // Atualizar agendamento
  fastify.put('/appointments/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const updateData = request.body as UpdateAppointmentRequest
    const user = request.user!

    const appointmentIndex = appointments.findIndex(a => 
      a._id === id && 
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    if (appointmentIndex === -1) {
      return reply.code(404).send({ error: 'Agendamento não encontrado' })
    }

    // Verificar conflitos se horário foi alterado
    if (updateData.date || updateData.time || updateData.duration) {
      const appointment = appointments[appointmentIndex]
      const newDate = updateData.date || appointment.date
      const newTime = updateData.time || appointment.time
      const newDuration = updateData.duration || appointment.duration

      if (hasTimeConflict(
        updateData.doctorId || appointment.doctorId,
        newDate,
        newTime,
        newDuration,
        id
      )) {
        return reply.code(409).send({ error: 'Conflito de horário detectado' })
      }
    }

    const updatedAppointment = {
      ...appointments[appointmentIndex],
      ...updateData,
      updatedAt: new Date().toISOString(),
    }

    appointments[appointmentIndex] = updatedAppointment

    reply.send({ appointment: updatedAppointment })
  })

  // Deletar agendamento
  fastify.delete('/appointments/:id', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const appointmentIndex = appointments.findIndex(a => 
      a._id === id && 
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    if (appointmentIndex === -1) {
      return reply.code(404).send({ error: 'Agendamento não encontrado' })
    }

    const deletedAppointment = appointments.splice(appointmentIndex, 1)[0]

    reply.send({ message: 'Agendamento deletado com sucesso', appointment: deletedAppointment })
  })

  // Buscar agendamentos por médico
  fastify.get('/appointments/doctor/:doctorId', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const { doctorId } = request.params as { doctorId: string }
    const { date } = request.query as any
    const user = request.user!

    let doctorAppointments = appointments.filter(a => 
      a.doctorId === doctorId &&
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    if (date) {
      doctorAppointments = doctorAppointments.filter(a => a.date === date)
    }

    // Ordenar por data e hora
    doctorAppointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })

    reply.send({ appointments: doctorAppointments })
  })

  // Buscar agendamentos por paciente
  fastify.get('/appointments/patient/:patientId', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse', 'receptionist'])],
  }, async (request, reply) => {
    const { patientId } = request.params as { patientId: string }
    const user = request.user!

    const patientAppointments = appointments.filter(a => 
      a.patientId === patientId &&
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    // Ordenar por data e hora
    patientAppointments.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`)
      const dateB = new Date(`${b.date}T${b.time}`)
      return dateA.getTime() - dateB.getTime()
    })

    reply.send({ appointments: patientAppointments })
  })

  // Confirmar agendamento
  fastify.put('/appointments/:id/confirm', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const appointmentIndex = appointments.findIndex(a => 
      a._id === id && 
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    if (appointmentIndex === -1) {
      return reply.code(404).send({ error: 'Agendamento não encontrado' })
    }

    appointments[appointmentIndex].status = 'confirmed'
    appointments[appointmentIndex].updatedAt = new Date().toISOString()

    reply.send({ appointment: appointments[appointmentIndex] })
  })

  // Cancelar agendamento
  fastify.put('/appointments/:id/cancel', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = request.user!

    const appointmentIndex = appointments.findIndex(a => 
      a._id === id && 
      a.hospitalId === user.hospitalId && 
      a.organizationId === user.organizationId
    )

    if (appointmentIndex === -1) {
      return reply.code(404).send({ error: 'Agendamento não encontrado' })
    }

    appointments[appointmentIndex].status = 'cancelled'
    appointments[appointmentIndex].updatedAt = new Date().toISOString()

    reply.send({ appointment: appointments[appointmentIndex] })
  })

  next()
} 