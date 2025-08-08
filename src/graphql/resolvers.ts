// Simulação de dados em memória (em produção viria do banco)
const users: any[] = []
const patients: any[] = []
const doctors: any[] = []
const appointments: any[] = []
const medications: any[] = []
const inventory: any[] = []
const prescriptions: any[] = []

const resolvers = {
  Query: {
    // Utilitários
    add: async (_: any, { x, y }: any) => x + y,

    // Autenticação
    me: async (parent: any, args: any, context: any) => {
      // Em produção, extrairia o usuário do contexto de autenticação
      return users[0] || null
    },

    // Pacientes
    patients: async (parent: any, { page = 1, limit = 10, search }: any) => {
      let filteredPatients = patients

      if (search) {
        const searchLower = search.toLowerCase()
        filteredPatients = filteredPatients.filter((p: any) =>
          p.firstName.toLowerCase().includes(searchLower) ||
          p.lastName.toLowerCase().includes(searchLower)
        )
      }

      const startIndex = (page - 1) * limit
      const endIndex = page * limit
      const paginatedPatients = filteredPatients.slice(startIndex, endIndex)

      return {
        patients: paginatedPatients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredPatients.length,
          totalPages: Math.ceil(filteredPatients.length / limit),
        },
      }
    },

    patient: async (parent: any, { id }: any) => {
      return patients.find((p: any) => p._id === id) || null
    },

    // Médicos
    doctors: async (parent: any, { page = 1, limit = 10, specialization, status }: any) => {
      let filteredDoctors = doctors

      if (specialization) {
        filteredDoctors = filteredDoctors.filter((d: any) =>
          d.specialization.toLowerCase().includes(specialization.toLowerCase())
        )
      }

      if (status) {
        filteredDoctors = filteredDoctors.filter((d: any) => d.status === status)
      }

      const startIndex = (page - 1) * limit
      const endIndex = page * limit
      const paginatedDoctors = filteredDoctors.slice(startIndex, endIndex)

      return {
        doctors: paginatedDoctors,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredDoctors.length,
          totalPages: Math.ceil(filteredDoctors.length / limit),
        },
      }
    },

    doctor: async (parent: any, { id }: any) => {
      return doctors.find((d: any) => d._id === id) || null
    },

    doctorsBySpecialization: async (parent: any, { specialization }: any) => {
      return doctors.filter((d: any) =>
        d.specialization.toLowerCase().includes(specialization.toLowerCase())
      )
    },

    // Agendamentos
    appointments: async (parent: any, { page = 1, limit = 10, date, doctorId, patientId, status }: any) => {
      let filteredAppointments = appointments

      if (date) {
        filteredAppointments = filteredAppointments.filter((a: any) => a.date === date)
      }
      if (doctorId) {
        filteredAppointments = filteredAppointments.filter((a: any) => a.doctorId === doctorId)
      }
      if (patientId) {
        filteredAppointments = filteredAppointments.filter((a: any) => a.patientId === patientId)
      }
      if (status) {
        filteredAppointments = filteredAppointments.filter((a: any) => a.status === status)
      }

      const startIndex = (page - 1) * limit
      const endIndex = page * limit
      const paginatedAppointments = filteredAppointments.slice(startIndex, endIndex)

      return {
        appointments: paginatedAppointments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredAppointments.length,
          totalPages: Math.ceil(filteredAppointments.length / limit),
        },
      }
    },

    appointment: async (parent: any, { id }: any) => {
      return appointments.find((a: any) => a._id === id) || null
    },

    appointmentsByDoctor: async (parent: any, { doctorId, date }: any) => {
      let doctorAppointments = appointments.filter((a: any) => a.doctorId === doctorId)

      if (date) {
        doctorAppointments = doctorAppointments.filter((a: any) => a.date === date)
      }

      return doctorAppointments
    },

    appointmentsByPatient: async (parent: any, { patientId }: any) => {
      return appointments.filter((a: any) => a.patientId === patientId)
    },

    // Medicamentos
    medications: async (parent: any, { page = 1, limit = 10, category, search }: any) => {
      let filteredMedications = medications

      if (category) {
        filteredMedications = filteredMedications.filter((m: any) => m.category === category)
      }

      if (search) {
        const searchLower = search.toLowerCase()
        filteredMedications = filteredMedications.filter((m: any) =>
          m.name.toLowerCase().includes(searchLower) ||
          m.genericName.toLowerCase().includes(searchLower)
        )
      }

      const startIndex = (page - 1) * limit
      const endIndex = page * limit
      const paginatedMedications = filteredMedications.slice(startIndex, endIndex)

      return {
        medications: paginatedMedications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredMedications.length,
          totalPages: Math.ceil(filteredMedications.length / limit),
        },
      }
    },

    medication: async (parent: any, { id }: any) => {
      return medications.find((m: any) => m._id === id) || null
    },

    // Inventário
    inventory: async (parent: any, { medicationId, status, location }: any) => {
      let filteredInventory = inventory

      if (medicationId) {
        filteredInventory = filteredInventory.filter((i: any) => i.medicationId === medicationId)
      }
      if (status) {
        filteredInventory = filteredInventory.filter((i: any) => i.status === status)
      }
      if (location) {
        filteredInventory = filteredInventory.filter((i: any) => i.location === location)
      }

      // Adicionar informações do medicamento
      const inventoryWithMedication = filteredInventory.map((item: any) => {
        const medication = medications.find((m: any) => m._id === item.medicationId)
        return {
          ...item,
          medication: medication || null,
        }
      })

      return { inventory: inventoryWithMedication }
    },

    // Prescrições
    prescriptions: async (parent: any, { patientId, doctorId, status }: any) => {
      let filteredPrescriptions = prescriptions

      if (patientId) {
        filteredPrescriptions = filteredPrescriptions.filter((p: any) => p.patientId === patientId)
      }
      if (doctorId) {
        filteredPrescriptions = filteredPrescriptions.filter((p: any) => p.doctorId === doctorId)
      }
      if (status) {
        filteredPrescriptions = filteredPrescriptions.filter((p: any) => p.status === status)
      }

      // Adicionar informações dos medicamentos
      const prescriptionsWithMedications = filteredPrescriptions.map((prescription: any) => {
        const medicationsWithDetails = prescription.medications.map((med: any) => {
          const medication = medications.find((m: any) => m._id === med.medicationId)
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

      return { prescriptions: prescriptionsWithMedications }
    },

    prescription: async (parent: any, { id }: any) => {
      const prescription = prescriptions.find((p: any) => p._id === id)
      if (!prescription) return null

      // Adicionar informações dos medicamentos
      const medicationsWithDetails = prescription.medications.map((med: any) => {
        const medication = medications.find((m: any) => m._id === med.medicationId)
        return {
          ...med,
          medication: medication || null,
        }
      })

      return {
        ...prescription,
        medications: medicationsWithDetails,
      }
    },

    prescriptionsByPatient: async (parent: any, { patientId }: any) => {
      const patientPrescriptions = prescriptions.filter((p: any) => p.patientId === patientId)

      // Adicionar informações dos medicamentos
      return patientPrescriptions.map((prescription: any) => {
        const medicationsWithDetails = prescription.medications.map((med: any) => {
          const medication = medications.find((m: any) => m._id === med.medicationId)
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
    },

    // Relatórios
    dashboard: async (parent: any, { startDate, endDate }: any) => {
      return {
        totalPatients: 1250,
        totalDoctors: 45,
        totalAppointments: 320,
        totalRevenue: 45000,
        pendingAppointments: 15,
        lowStockMedications: 8,
        todayAppointments: 12,
        thisWeekAppointments: 85,
      }
    },

    appointmentStats: async (parent: any, { startDate, endDate, doctorId, appointmentType }: any) => {
      return {
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
    },

    patientStats: async (parent: any, { startDate, endDate }: any) => {
      return {
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
    },

    revenueStats: async (parent: any, { startDate, endDate }: any) => {
      return {
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
    },

    medicationStats: async (parent: any, { startDate, endDate }: any) => {
      return {
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
    },

    bedOccupancy: async (parent: any, { startDate, endDate }: any) => {
      return {
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
    },

    doctorEfficiency: async (parent: any, { startDate, endDate }: any) => {
      return {
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
    },

    qualityMetrics: async (parent: any, { startDate, endDate }: any) => {
      return {
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
    },
  },

  Mutation: {
    // Autenticação
    login: async (parent: any, { username, password }: any) => {
      // Em produção, validaria credenciais no banco
      const mockUser = {
        _id: 'user1',
        username,
        email: 'user@hospital.com',
        role: 'admin',
        hospitalId: 'hospital1',
        organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      return {
        token: 'mock-jwt-token',
        user: mockUser,
      }
    },

    register: async (parent: any, { username, email, password, role, hospitalId, organizationId }: any) => {
      const newUser = {
        _id: 'user' + Date.now(),
        username,
        email,
        role,
        hospitalId,
        organizationId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      users.push(newUser)

      return {
        token: 'mock-jwt-token',
        user: newUser,
      }
    },

    // Pacientes
    createPatient: async (parent: any, { input }: any) => {
      const newPatient = {
        _id: 'patient' + Date.now(),
        ...input,
        hospitalId: 'hospital1',
        organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      patients.push(newPatient)
      return newPatient
    },

    updatePatient: async (parent: any, { id, input }: any) => {
      const patientIndex = patients.findIndex((p: any) => p._id === id)
      if (patientIndex === -1) throw new Error('Paciente não encontrado')

      patients[patientIndex] = {
        ...patients[patientIndex],
        ...input,
        updatedAt: new Date().toISOString(),
      }

      return patients[patientIndex]
    },

    deletePatient: async (parent: any, { id }: any) => {
      const patientIndex = patients.findIndex((p: any) => p._id === id)
      if (patientIndex === -1) throw new Error('Paciente não encontrado')

      const deletedPatient = patients.splice(patientIndex, 1)[0]
      return deletedPatient
    },

    // Médicos
    createDoctor: async (parent: any, { input }: any) => {
      const newDoctor = {
        _id: 'doctor' + Date.now(),
        ...input,
        hospitalId: 'hospital1',
        organizationId: 'org1',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      doctors.push(newDoctor)
      return newDoctor
    },

    updateDoctor: async (parent: any, { id, input }: any) => {
      const doctorIndex = doctors.findIndex((d: any) => d._id === id)
      if (doctorIndex === -1) throw new Error('Médico não encontrado')

      doctors[doctorIndex] = {
        ...doctors[doctorIndex],
        ...input,
        updatedAt: new Date().toISOString(),
      }

      return doctors[doctorIndex]
    },

    deleteDoctor: async (parent: any, { id }: any) => {
      const doctorIndex = doctors.findIndex((d: any) => d._id === id)
      if (doctorIndex === -1) throw new Error('Médico não encontrado')

      const deletedDoctor = doctors.splice(doctorIndex, 1)[0]
      return deletedDoctor
    },

    updateDoctorAvailability: async (parent: any, { id, availability }: any) => {
      const doctorIndex = doctors.findIndex((d: any) => d._id === id)
      if (doctorIndex === -1) throw new Error('Médico não encontrado')

      doctors[doctorIndex].availability = availability
      doctors[doctorIndex].updatedAt = new Date().toISOString()

      return doctors[doctorIndex]
    },

    // Agendamentos
    createAppointment: async (parent: any, { input }: any) => {
      const newAppointment = {
        _id: 'appointment' + Date.now(),
        ...input,
        duration: input.duration || 30,
        status: 'scheduled',
        hospitalId: 'hospital1',
        organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      appointments.push(newAppointment)
      return newAppointment
    },

    updateAppointment: async (parent: any, { id, input }: any) => {
      const appointmentIndex = appointments.findIndex((a: any) => a._id === id)
      if (appointmentIndex === -1) throw new Error('Agendamento não encontrado')

      appointments[appointmentIndex] = {
        ...appointments[appointmentIndex],
        ...input,
        updatedAt: new Date().toISOString(),
      }

      return appointments[appointmentIndex]
    },

    deleteAppointment: async (parent: any, { id }: any) => {
      const appointmentIndex = appointments.findIndex((a: any) => a._id === id)
      if (appointmentIndex === -1) throw new Error('Agendamento não encontrado')

      const deletedAppointment = appointments.splice(appointmentIndex, 1)[0]
      return deletedAppointment
    },

    confirmAppointment: async (parent: any, { id }: any) => {
      const appointmentIndex = appointments.findIndex((a: any) => a._id === id)
      if (appointmentIndex === -1) throw new Error('Agendamento não encontrado')

      appointments[appointmentIndex].status = 'confirmed'
      appointments[appointmentIndex].updatedAt = new Date().toISOString()

      return appointments[appointmentIndex]
    },

    cancelAppointment: async (parent: any, { id }: any) => {
      const appointmentIndex = appointments.findIndex((a: any) => a._id === id)
      if (appointmentIndex === -1) throw new Error('Agendamento não encontrado')

      appointments[appointmentIndex].status = 'cancelled'
      appointments[appointmentIndex].updatedAt = new Date().toISOString()

      return appointments[appointmentIndex]
    },

    // Medicamentos
    createMedication: async (parent: any, { input }: any) => {
      const newMedication = {
        _id: 'medication' + Date.now(),
        ...input,
        hospitalId: 'hospital1',
        organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      medications.push(newMedication)
      return newMedication
    },

    updateMedication: async (parent: any, { id, input }: any) => {
      const medicationIndex = medications.findIndex((m: any) => m._id === id)
      if (medicationIndex === -1) throw new Error('Medicamento não encontrado')

      medications[medicationIndex] = {
        ...medications[medicationIndex],
        ...input,
        updatedAt: new Date().toISOString(),
      }

      return medications[medicationIndex]
    },

    deleteMedication: async (parent: any, { id }: any) => {
      const medicationIndex = medications.findIndex((m: any) => m._id === id)
      if (medicationIndex === -1) throw new Error('Medicamento não encontrado')

      const deletedMedication = medications.splice(medicationIndex, 1)[0]
      return deletedMedication
    },

    // Inventário
    addToInventory: async (parent: any, { input }: any) => {
      const newInventory = {
        _id: 'inventory' + Date.now(),
        ...input,
        status: 'available',
        hospitalId: 'hospital1',
        organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      inventory.push(newInventory)
      return newInventory
    },

    updateInventoryQuantity: async (parent: any, { id, quantity }: any) => {
      const inventoryIndex = inventory.findIndex((i: any) => i._id === id)
      if (inventoryIndex === -1) throw new Error('Item do inventário não encontrado')

      inventory[inventoryIndex].quantity = quantity
      inventory[inventoryIndex].updatedAt = new Date().toISOString()

      return inventory[inventoryIndex]
    },

    // Prescrições
    createPrescription: async (parent: any, { input }: any) => {
      const newPrescription = {
        _id: 'prescription' + Date.now(),
        ...input,
        status: 'active',
        prescribedDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        hospitalId: 'hospital1',
        organizationId: 'org1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      prescriptions.push(newPrescription)
      return newPrescription
    },

    updatePrescriptionStatus: async (parent: any, { id, status }: any) => {
      const prescriptionIndex = prescriptions.findIndex((p: any) => p._id === id)
      if (prescriptionIndex === -1) throw new Error('Prescrição não encontrada')

      prescriptions[prescriptionIndex].status = status
      prescriptions[prescriptionIndex].updatedAt = new Date().toISOString()

      return prescriptions[prescriptionIndex]
    },

    // Relatórios
    customReport: async (parent: any, { metrics, filters, groupBy, sortBy }: any) => {
      return {
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
        filters,
        groupBy,
        sortBy,
      }
    },
  },
}

export default resolvers
