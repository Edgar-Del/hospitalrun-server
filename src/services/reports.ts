import { Server, IncomingMessage, ServerResponse } from 'http'
import { FastifyInstance, FastifyPluginOptions } from 'fastify'

interface ReportFilters {
  startDate?: string
  endDate?: string
  doctorId?: string
  patientId?: string
  department?: string
  appointmentType?: string
}

interface AppointmentStats {
  total: number
  scheduled: number
  confirmed: number
  completed: number
  cancelled: number
  noShow: number
  byType: Record<string, number>
  byDoctor: Record<string, number>
  byDate: Record<string, number>
}

interface PatientStats {
  total: number
  newThisMonth: number
  byGender: Record<string, number>
  byAgeGroup: Record<string, number>
  byBloodType: Record<string, number>
  topDiagnoses: Array<{ diagnosis: string; count: number }>
}

interface RevenueStats {
  totalRevenue: number
  revenueByMonth: Record<string, number>
  revenueByDoctor: Record<string, number>
  revenueByAppointmentType: Record<string, number>
  averageConsultationFee: number
}

interface MedicationStats {
  totalMedications: number
  lowStockItems: number
  expiredItems: number
  topPrescribedMedications: Array<{ medication: string; count: number }>
  inventoryValue: number
}

// Simulação de dados para relatórios (em produção viria do banco)
const mockAppointments = [
  { date: '2024-01-15', type: 'consultation', status: 'completed', doctorId: 'doc1', patientId: 'pat1' },
  { date: '2024-01-16', type: 'follow_up', status: 'confirmed', doctorId: 'doc2', patientId: 'pat2' },
  { date: '2024-01-17', type: 'emergency', status: 'completed', doctorId: 'doc1', patientId: 'pat3' },
]

const mockPatients = [
  { gender: 'male', age: 35, bloodType: 'A+', diagnosis: 'Hypertension' },
  { gender: 'female', age: 28, bloodType: 'O+', diagnosis: 'Diabetes' },
  { gender: 'male', age: 45, bloodType: 'B+', diagnosis: 'Hypertension' },
]

export default (
  fastify: FastifyInstance<Server, IncomingMessage, ServerResponse>,
  _: FastifyPluginOptions,
  next: (error?: Error) => void,
) => {
  // Dashboard geral
  fastify.get('/reports/dashboard', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate } = request.query as ReportFilters

    // Em produção, estes dados viriam do banco de dados
    const dashboard = {
      totalPatients: 1250,
      totalDoctors: 45,
      totalAppointments: 320,
      totalRevenue: 45000,
      pendingAppointments: 15,
      lowStockMedications: 8,
      todayAppointments: 12,
      thisWeekAppointments: 85,
    }

    reply.send({ dashboard })
  })

  // Relatório de agendamentos
  fastify.get('/reports/appointments', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate, doctorId, appointmentType } = request.query as ReportFilters

    // Simulação de dados de agendamentos
    const appointmentStats: AppointmentStats = {
      total: 320,
      scheduled: 45,
      confirmed: 180,
      completed: 85,
      cancelled: 8,
      noShow: 2,
      byType: {
        consultation: 200,
        follow_up: 80,
        emergency: 25,
        surgery: 10,
        examination: 5,
      },
      byDoctor: {
        'Dr. Silva': 120,
        'Dr. Santos': 85,
        'Dr. Oliveira': 75,
        'Dr. Costa': 40,
      },
      byDate: {
        '2024-01-15': 12,
        '2024-01-16': 15,
        '2024-01-17': 8,
        '2024-01-18': 20,
        '2024-01-19': 18,
      },
    }

    reply.send({ appointmentStats })
  })

  // Relatório de pacientes
  fastify.get('/reports/patients', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate } = request.query as ReportFilters

    const patientStats: PatientStats = {
      total: 1250,
      newThisMonth: 45,
      byGender: {
        male: 620,
        female: 630,
      },
      byAgeGroup: {
        '0-18': 150,
        '19-30': 280,
        '31-50': 450,
        '51-70': 300,
        '70+': 70,
      },
      byBloodType: {
        'A+': 350,
        'A-': 45,
        'B+': 280,
        'B-': 35,
        'AB+': 120,
        'AB-': 15,
        'O+': 320,
        'O-': 85,
      },
      topDiagnoses: [
        { diagnosis: 'Hypertension', count: 180 },
        { diagnosis: 'Diabetes', count: 120 },
        { diagnosis: 'Respiratory Infection', count: 95 },
        { diagnosis: 'Cardiovascular Disease', count: 75 },
        { diagnosis: 'Gastroenteritis', count: 60 },
      ],
    }

    reply.send({ patientStats })
  })

  // Relatório de receita
  fastify.get('/reports/revenue', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate } = request.query as ReportFilters

    const revenueStats: RevenueStats = {
      totalRevenue: 450000,
      revenueByMonth: {
        '2024-01': 45000,
        '2024-02': 48000,
        '2024-03': 52000,
        '2024-04': 49000,
        '2024-05': 55000,
        '2024-06': 58000,
      },
      revenueByDoctor: {
        'Dr. Silva': 120000,
        'Dr. Santos': 95000,
        'Dr. Oliveira': 85000,
        'Dr. Costa': 75000,
        'Dr. Ferreira': 75000,
      },
      revenueByAppointmentType: {
        consultation: 250000,
        follow_up: 120000,
        emergency: 45000,
        surgery: 25000,
        examination: 10000,
      },
      averageConsultationFee: 150,
    }

    reply.send({ revenueStats })
  })

  // Relatório de medicamentos
  fastify.get('/reports/medications', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'pharmacist'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate } = request.query as ReportFilters

    const medicationStats: MedicationStats = {
      totalMedications: 450,
      lowStockItems: 12,
      expiredItems: 3,
      topPrescribedMedications: [
        { medication: 'Paracetamol 500mg', count: 280 },
        { medication: 'Ibuprofen 400mg', count: 220 },
        { medication: 'Amoxicillin 500mg', count: 180 },
        { medication: 'Omeprazole 20mg', count: 150 },
        { medication: 'Metformin 500mg', count: 120 },
      ],
      inventoryValue: 85000,
    }

    reply.send({ medicationStats })
  })

  // Relatório de ocupação de leitos
  fastify.get('/reports/bed-occupancy', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor', 'nurse'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate } = request.query as ReportFilters

    const bedOccupancy = {
      totalBeds: 120,
      occupiedBeds: 85,
      availableBeds: 35,
      occupancyRate: 70.8,
      byDepartment: {
        'Internal Medicine': { total: 40, occupied: 32, rate: 80 },
        'Surgery': { total: 30, occupied: 18, rate: 60 },
        'Pediatrics': { total: 25, occupied: 20, rate: 80 },
        'ICU': { total: 15, occupied: 12, rate: 80 },
        'Emergency': { total: 10, occupied: 3, rate: 30 },
      },
      averageLengthOfStay: 4.2,
    }

    reply.send({ bedOccupancy })
  })

  // Relatório de eficiência médica
  fastify.get('/reports/doctor-efficiency', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin', 'doctor'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate } = request.query as ReportFilters

    const doctorEfficiency = {
      doctors: [
        {
          id: 'doc1',
          name: 'Dr. Silva',
          specialization: 'Cardiology',
          appointmentsCompleted: 120,
          averageConsultationTime: 25,
          patientSatisfaction: 4.8,
          revenue: 120000,
        },
        {
          id: 'doc2',
          name: 'Dr. Santos',
          specialization: 'Internal Medicine',
          appointmentsCompleted: 95,
          averageConsultationTime: 30,
          patientSatisfaction: 4.6,
          revenue: 95000,
        },
        {
          id: 'doc3',
          name: 'Dr. Oliveira',
          specialization: 'Pediatrics',
          appointmentsCompleted: 110,
          averageConsultationTime: 20,
          patientSatisfaction: 4.9,
          revenue: 85000,
        },
      ],
      averageMetrics: {
        appointmentsPerDoctor: 108,
        averageConsultationTime: 25,
        averagePatientSatisfaction: 4.7,
        averageRevenue: 100000,
      },
    }

    reply.send({ doctorEfficiency })
  })

  // Relatório de qualidade do atendimento
  fastify.get('/reports/quality-metrics', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const user = request.user!
    const { startDate, endDate } = request.query as ReportFilters

    const qualityMetrics = {
      patientSatisfaction: {
        overall: 4.7,
        byDepartment: {
          'Internal Medicine': 4.6,
          'Surgery': 4.8,
          'Pediatrics': 4.9,
          'Emergency': 4.5,
        },
      },
      waitTimes: {
        averageWaitTime: 15,
        averageConsultationTime: 25,
        byDepartment: {
          'Internal Medicine': { wait: 12, consultation: 30 },
          'Surgery': { wait: 20, consultation: 45 },
          'Pediatrics': { wait: 10, consultation: 20 },
          'Emergency': { wait: 5, consultation: 15 },
        },
      },
      readmissionRate: 2.5,
      infectionRate: 0.8,
      mortalityRate: 1.2,
      complianceRate: 95.5,
    }

    reply.send({ qualityMetrics })
  })

  // Exportar relatório em CSV
  fastify.get('/reports/export/:type', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const { type } = request.params as { type: string }
    const user = request.user!

    // Em produção, geraria um arquivo CSV real
    const csvData = `Date,Type,Status,Doctor,Patient
2024-01-15,consultation,completed,Dr. Silva,Patient A
2024-01-16,follow_up,confirmed,Dr. Santos,Patient B
2024-01-17,emergency,completed,Dr. Silva,Patient C`

    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', `attachment; filename=${type}-report-${new Date().toISOString().split('T')[0]}.csv`)
      .send(csvData)
  })

  // Relatório personalizado
  fastify.post('/reports/custom', {
    preHandler: [fastify.authenticate, fastify.requireRole(['admin'])],
  }, async (request, reply) => {
    const user = request.user!
    const { metrics, filters, groupBy, sortBy } = request.body as any

    // Em produção, construiria uma query dinâmica baseada nos parâmetros
    const customReport = {
      data: [
        { date: '2024-01-15', metric1: 120, metric2: 85, metric3: 95 },
        { date: '2024-01-16', metric1: 135, metric2: 90, metric3: 100 },
        { date: '2024-01-17', metric1: 110, metric2: 75, metric3: 85 },
      ],
      summary: {
        total: 365,
        average: 121.7,
        min: 75,
        max: 135,
      },
      filters: filters,
      groupBy: groupBy,
      sortBy: sortBy,
    }

    reply.send({ customReport })
  })

  next()
} 