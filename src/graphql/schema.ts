const schema = `
  type User {
    _id: ID!
    username: String!
    email: String!
    role: UserRole!
    hospitalId: String!
    organizationId: String!
    createdAt: String!
    updatedAt: String!
  }

  type Patient {
    _id: ID!
    firstName: String!
    lastName: String!
    dateOfBirth: String!
    gender: Gender!
    bloodType: BloodType
    phone: String!
    email: String
    address: Address!
    emergencyContact: EmergencyContact!
    medicalHistory: [String!]!
    allergies: [String!]!
    currentMedications: [String!]!
    insurance: Insurance!
    hospitalId: String!
    organizationId: String!
    createdAt: String!
    updatedAt: String!
  }

  type Doctor {
    _id: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String!
    specialization: String!
    licenseNumber: String!
    experience: Int!
    education: [Education!]!
    certifications: [String!]!
    languages: [String!]!
    availability: Availability!
    consultationFee: Float!
    hospitalId: String!
    organizationId: String!
    status: DoctorStatus!
    createdAt: String!
    updatedAt: String!
  }

  type Appointment {
    _id: ID!
    patientId: String!
    doctorId: String!
    date: String!
    time: String!
    duration: Int!
    type: AppointmentType!
    status: AppointmentStatus!
    notes: String
    symptoms: String
    diagnosis: String
    prescription: [String!]
    hospitalId: String!
    organizationId: String!
    createdAt: String!
    updatedAt: String!
  }

  type Medication {
    _id: ID!
    name: String!
    genericName: String!
    category: MedicationCategory!
    dosageForm: DosageForm!
    strength: String!
    manufacturer: String!
    description: String!
    sideEffects: [String!]!
    contraindications: [String!]!
    interactions: [String!]!
    storageConditions: String!
    prescriptionRequired: Boolean!
    controlledSubstance: Boolean!
    hospitalId: String!
    organizationId: String!
    createdAt: String!
    updatedAt: String!
  }

  type Inventory {
    _id: ID!
    medicationId: String!
    batchNumber: String!
    quantity: Int!
    unit: InventoryUnit!
    expiryDate: String!
    purchaseDate: String!
    purchasePrice: Float!
    supplier: String!
    location: String!
    status: InventoryStatus!
    hospitalId: String!
    organizationId: String!
    createdAt: String!
    updatedAt: String!
    medication: Medication
  }

  type Prescription {
    _id: ID!
    patientId: String!
    doctorId: String!
    appointmentId: String
    medications: [PrescriptionMedication!]!
    diagnosis: String!
    notes: String
    status: PrescriptionStatus!
    prescribedDate: String!
    expiryDate: String!
    hospitalId: String!
    organizationId: String!
    createdAt: String!
    updatedAt: String!
  }

  type PrescriptionMedication {
    medicationId: String!
    dosage: String!
    frequency: String!
    duration: String!
    instructions: String!
    quantity: Int!
    medication: Medication
  }

  type Address {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
  }

  type EmergencyContact {
    name: String!
    relationship: String!
    phone: String!
  }

  type Insurance {
    provider: String!
    policyNumber: String!
    groupNumber: String
  }

  type Education {
    degree: String!
    institution: String!
    year: Int!
  }

  type Availability {
    monday: TimeSlot!
    tuesday: TimeSlot!
    wednesday: TimeSlot!
    thursday: TimeSlot!
    friday: TimeSlot!
    saturday: TimeSlot!
    sunday: TimeSlot!
  }

  type TimeSlot {
    start: String!
    end: String!
    available: Boolean!
  }

  type Pagination {
    page: Int!
    limit: Int!
    total: Int!
    totalPages: Int!
  }

  type PatientsResponse {
    patients: [Patient!]!
    pagination: Pagination!
  }

  type DoctorsResponse {
    doctors: [Doctor!]!
    pagination: Pagination!
  }

  type AppointmentsResponse {
    appointments: [Appointment!]!
    pagination: Pagination!
  }

  type MedicationsResponse {
    medications: [Medication!]!
    pagination: Pagination!
  }

  type InventoryResponse {
    inventory: [Inventory!]!
  }

  type PrescriptionsResponse {
    prescriptions: [Prescription!]!
  }

  type Dashboard {
    totalPatients: Int!
    totalDoctors: Int!
    totalAppointments: Int!
    totalRevenue: Float!
    pendingAppointments: Int!
    lowStockMedications: Int!
    todayAppointments: Int!
    thisWeekAppointments: Int!
  }

  type AppointmentStats {
    total: Int!
    scheduled: Int!
    confirmed: Int!
    completed: Int!
    cancelled: Int!
    noShow: Int!
    byType: JSON!
    byDoctor: JSON!
    byDate: JSON!
  }

  type PatientStats {
    total: Int!
    newThisMonth: Int!
    byGender: JSON!
    byAgeGroup: JSON!
    byBloodType: JSON!
    topDiagnoses: [DiagnosisCount!]!
  }

  type DiagnosisCount {
    diagnosis: String!
    count: Int!
  }

  type RevenueStats {
    totalRevenue: Float!
    revenueByMonth: JSON!
    revenueByDoctor: JSON!
    revenueByAppointmentType: JSON!
    averageConsultationFee: Float!
  }

  type MedicationStats {
    totalMedications: Int!
    lowStockItems: Int!
    expiredItems: Int!
    topPrescribedMedications: [MedicationCount!]!
    inventoryValue: Float!
  }

  type MedicationCount {
    medication: String!
    count: Int!
  }

  type BedOccupancy {
    totalBeds: Int!
    occupiedBeds: Int!
    availableBeds: Int!
    occupancyRate: Float!
    byDepartment: JSON!
    averageLengthOfStay: Float!
  }

  type DoctorEfficiency {
    doctors: [DoctorEfficiencyData!]!
    averageMetrics: AverageMetrics!
  }

  type DoctorEfficiencyData {
    id: String!
    name: String!
    specialization: String!
    appointmentsCompleted: Int!
    averageConsultationTime: Int!
    patientSatisfaction: Float!
    revenue: Float!
  }

  type AverageMetrics {
    appointmentsPerDoctor: Int!
    averageConsultationTime: Int!
    averagePatientSatisfaction: Float!
    averageRevenue: Float!
  }

  type QualityMetrics {
    patientSatisfaction: PatientSatisfaction!
    waitTimes: WaitTimes!
    readmissionRate: Float!
    infectionRate: Float!
    mortalityRate: Float!
    complianceRate: Float!
  }

  type PatientSatisfaction {
    overall: Float!
    byDepartment: JSON!
  }

  type WaitTimes {
    averageWaitTime: Int!
    averageConsultationTime: Int!
    byDepartment: JSON!
  }

  type AuthResponse {
    token: String!
    user: User!
  }

  type CustomReport {
    data: [JSON!]!
    summary: JSON!
    filters: JSON
    groupBy: String
    sortBy: String
  }

  enum UserRole {
    admin
    doctor
    nurse
    receptionist
    pharmacist
  }

  enum Gender {
    male
    female
    other
  }

  enum BloodType {
    A_PLUS
    A_MINUS
    B_PLUS
    B_MINUS
    AB_PLUS
    AB_MINUS
    O_PLUS
    O_MINUS
  }

  enum DoctorStatus {
    active
    inactive
    on_leave
  }

  enum AppointmentType {
    consultation
    follow_up
    emergency
    surgery
    examination
  }

  enum AppointmentStatus {
    scheduled
    confirmed
    in_progress
    completed
    cancelled
    no_show
  }

  enum MedicationCategory {
    antibiotic
    analgesic
    antihypertensive
    diabetic
    psychiatric
    other
  }

  enum DosageForm {
    tablet
    capsule
    liquid
    injection
    cream
    drops
    inhaler
  }

  enum InventoryUnit {
    tablets
    capsules
    bottles
    tubes
    vials
  }

  enum InventoryStatus {
    available
    low_stock
    expired
    recalled
  }

  enum PrescriptionStatus {
    active
    completed
    cancelled
  }

  scalar JSON

  type Query {
    # Autenticação
    me: User

    # Pacientes
    patients(page: Int, limit: Int, search: String): PatientsResponse!
    patient(id: ID!): Patient

    # Médicos
    doctors(page: Int, limit: Int, specialization: String, status: DoctorStatus): DoctorsResponse!
    doctor(id: ID!): Doctor
    doctorsBySpecialization(specialization: String!): [Doctor!]!

    # Agendamentos
    appointments(page: Int, limit: Int, date: String, doctorId: String, patientId: String, status: AppointmentStatus): AppointmentsResponse!
    appointment(id: ID!): Appointment
    appointmentsByDoctor(doctorId: String!, date: String): [Appointment!]!
    appointmentsByPatient(patientId: String!): [Appointment!]!

    # Medicamentos
    medications(page: Int, limit: Int, category: MedicationCategory, search: String): MedicationsResponse!
    medication(id: ID!): Medication

    # Inventário
    inventory(medicationId: String, status: InventoryStatus, location: String): InventoryResponse!

    # Prescrições
    prescriptions(patientId: String, doctorId: String, status: PrescriptionStatus): PrescriptionsResponse!
    prescription(id: ID!): Prescription
    prescriptionsByPatient(patientId: String!): [Prescription!]!

    # Relatórios
    dashboard(startDate: String, endDate: String): Dashboard!
    appointmentStats(startDate: String, endDate: String, doctorId: String, appointmentType: AppointmentType): AppointmentStats!
    patientStats(startDate: String, endDate: String): PatientStats!
    revenueStats(startDate: String, endDate: String): RevenueStats!
    medicationStats(startDate: String, endDate: String): MedicationStats!
    bedOccupancy(startDate: String, endDate: String): BedOccupancy!
    doctorEfficiency(startDate: String, endDate: String): DoctorEfficiency!
    qualityMetrics(startDate: String, endDate: String): QualityMetrics!

    # Utilitários
    add(x: Int, y: Int): Int
  }

  type Mutation {
    # Autenticação
    login(username: String!, password: String!): AuthResponse!
    register(username: String!, email: String!, password: String!, role: UserRole!, hospitalId: String!, organizationId: String!): AuthResponse!

    # Pacientes
    createPatient(input: CreatePatientInput!): Patient!
    updatePatient(id: ID!, input: UpdatePatientInput!): Patient!
    deletePatient(id: ID!): Patient!

    # Médicos
    createDoctor(input: CreateDoctorInput!): Doctor!
    updateDoctor(id: ID!, input: UpdateDoctorInput!): Doctor!
    deleteDoctor(id: ID!): Doctor!
    updateDoctorAvailability(id: ID!, availability: AvailabilityInput!): Doctor!

    # Agendamentos
    createAppointment(input: CreateAppointmentInput!): Appointment!
    updateAppointment(id: ID!, input: UpdateAppointmentInput!): Appointment!
    deleteAppointment(id: ID!): Appointment!
    confirmAppointment(id: ID!): Appointment!
    cancelAppointment(id: ID!): Appointment!

    # Medicamentos
    createMedication(input: CreateMedicationInput!): Medication!
    updateMedication(id: ID!, input: UpdateMedicationInput!): Medication!
    deleteMedication(id: ID!): Medication!

    # Inventário
    addToInventory(input: CreateInventoryInput!): Inventory!
    updateInventoryQuantity(id: ID!, quantity: Int!): Inventory!

    # Prescrições
    createPrescription(input: CreatePrescriptionInput!): Prescription!
    updatePrescriptionStatus(id: ID!, status: PrescriptionStatus!): Prescription!

    # Relatórios
    customReport(metrics: [String!]!, filters: JSON, groupBy: String, sortBy: String): CustomReport!
  }

  input CreatePatientInput {
    firstName: String!
    lastName: String!
    dateOfBirth: String!
    gender: Gender!
    bloodType: BloodType
    phone: String!
    email: String
    address: AddressInput!
    emergencyContact: EmergencyContactInput!
    medicalHistory: [String!]
    allergies: [String!]
    currentMedications: [String!]
    insurance: InsuranceInput!
  }

  input UpdatePatientInput {
    firstName: String
    lastName: String
    dateOfBirth: String
    gender: Gender
    bloodType: BloodType
    phone: String
    email: String
    address: AddressInput
    emergencyContact: EmergencyContactInput
    medicalHistory: [String!]
    allergies: [String!]
    currentMedications: [String!]
    insurance: InsuranceInput
  }

  input CreateDoctorInput {
    firstName: String!
    lastName: String!
    email: String!
    phone: String!
    specialization: String!
    licenseNumber: String!
    experience: Int!
    education: [EducationInput!]!
    certifications: [String!]
    languages: [String!]
    availability: AvailabilityInput
    consultationFee: Float!
  }

  input UpdateDoctorInput {
    firstName: String
    lastName: String
    email: String
    phone: String
    specialization: String
    licenseNumber: String
    experience: Int
    education: [EducationInput!]
    certifications: [String!]
    languages: [String!]
    availability: AvailabilityInput
    consultationFee: Float
  }

  input CreateAppointmentInput {
    patientId: String!
    doctorId: String!
    date: String!
    time: String!
    duration: Int
    type: AppointmentType!
    notes: String
    symptoms: String
  }

  input UpdateAppointmentInput {
    patientId: String
    doctorId: String
    date: String
    time: String
    duration: Int
    type: AppointmentType
    status: AppointmentStatus
    notes: String
    symptoms: String
    diagnosis: String
    prescription: [String!]
  }

  input CreateMedicationInput {
    name: String!
    genericName: String!
    category: MedicationCategory!
    dosageForm: DosageForm!
    strength: String!
    manufacturer: String!
    description: String!
    sideEffects: [String!]
    contraindications: [String!]
    interactions: [String!]
    storageConditions: String!
    prescriptionRequired: Boolean!
    controlledSubstance: Boolean!
  }

  input UpdateMedicationInput {
    name: String
    genericName: String
    category: MedicationCategory
    dosageForm: DosageForm
    strength: String
    manufacturer: String
    description: String
    sideEffects: [String!]
    contraindications: [String!]
    interactions: [String!]
    storageConditions: String
    prescriptionRequired: Boolean
    controlledSubstance: Boolean
  }

  input CreateInventoryInput {
    medicationId: String!
    batchNumber: String!
    quantity: Int!
    unit: InventoryUnit!
    expiryDate: String!
    purchaseDate: String!
    purchasePrice: Float!
    supplier: String!
    location: String!
  }

  input CreatePrescriptionInput {
    patientId: String!
    doctorId: String!
    appointmentId: String
    medications: [PrescriptionMedicationInput!]!
    diagnosis: String!
    notes: String
  }

  input PrescriptionMedicationInput {
    medicationId: String!
    dosage: String!
    frequency: String!
    duration: String!
    instructions: String!
    quantity: Int!
  }

  input AddressInput {
    street: String!
    city: String!
    state: String!
    zipCode: String!
    country: String!
  }

  input EmergencyContactInput {
    name: String!
    relationship: String!
    phone: String!
  }

  input InsuranceInput {
    provider: String!
    policyNumber: String!
    groupNumber: String
  }

  input EducationInput {
    degree: String!
    institution: String!
    year: Int!
  }

  input AvailabilityInput {
    monday: TimeSlotInput!
    tuesday: TimeSlotInput!
    wednesday: TimeSlotInput!
    thursday: TimeSlotInput!
    friday: TimeSlotInput!
    saturday: TimeSlotInput!
    sunday: TimeSlotInput!
  }

  input TimeSlotInput {
    start: String!
    end: String!
    available: Boolean!
  }
`

export default schema
