import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Spinner from '@/components/ui/Spinner';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import AuthLayout from '@/components/layout/AuthLayout';

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Spinner size="lg" />
  </div>
);

const lazy_ = (fn) => {
  const Component = lazy(fn);
  return (
    <Suspense fallback={<Loading />}>
      <Component />
    </Suspense>
  );
};

// Public pages
const LandingPage = () => lazy_(() => import('@/pages/LandingPage'));

// Auth pages
const LoginPage = () => lazy_(() => import('@/pages/auth/LoginPage'));
const RegisterPage = () => lazy_(() => import('@/pages/auth/RegisterPage'));
const OAuthCallbackPage = () => lazy_(() => import('@/pages/auth/OAuthCallbackPage'));

// Shared pages
const NotFoundPage = () => lazy_(() => import('@/pages/shared/NotFoundPage'));
const UnauthorizedPage = () => lazy_(() => import('@/pages/shared/UnauthorizedPage'));
const ViewProfile = () => lazy_(() => import('@/pages/shared/ViewProfile'));
const UpdateProfile = () => lazy_(() => import('@/pages/shared/UpdateProfile'));
const MessagesPage = () => lazy_(() => import('@/pages/shared/Messages'));
const NotificationsPage = () => lazy_(() => import('@/pages/shared/NotificationsPage'));

// Patient pages
const PatientDashboard = () => lazy_(() => import('@/pages/patient/PatientDashboard'));
const BookAppointment = () => lazy_(() => import('@/pages/patient/BookAppointment'));
const MyAppointments = () => lazy_(() => import('@/pages/patient/MyAppointments'));
const PatientMedicalRecords = () => lazy_(() => import('@/pages/patient/MedicalRecords'));
const PatientPrescriptions = () => lazy_(() => import('@/pages/patient/Prescriptions'));
const PlaceOrder = () => lazy_(() => import('@/pages/patient/PlaceOrder'));
const MyOrders = () => lazy_(() => import('@/pages/patient/MyOrders'));
const AnswerQuestions = () => lazy_(() => import('@/pages/patient/AnswerQuestions'));
const MyAnswers = () => lazy_(() => import('@/pages/patient/MyAnswers'));
const BillingPayments = () => lazy_(() => import('@/pages/patient/BillingPayments'));
const PaymentMethods = () => lazy_(() => import('@/pages/patient/PaymentMethods'));
const TriageAssess = () => lazy_(() => import('@/pages/patient/TriageAssess'));
const TriageHistory = () => lazy_(() => import('@/pages/patient/TriageHistory'));
const PatientInsuranceRequests = () => lazy_(() => import('@/pages/patient/InsuranceRequests'));
const PatientSupportTickets = () => lazy_(() => import('@/pages/patient/SupportTickets'));
const PatientHealthLogs = () => lazy_(() => import('@/pages/patient/HealthLogs'));
const PatientConsultationHistory = () => lazy_(() => import('@/pages/patient/ConsultationHistory'));
const MyFollowUps = () => lazy_(() => import('@/pages/patient/MyFollowUps'));
const PatientHealthPrograms = () => lazy_(() => import('@/pages/patient/HealthPrograms'));

// Doctor pages
const DoctorDashboard = () => lazy_(() => import('@/pages/doctor/DoctorDashboard'));
const ViewPatients = () => lazy_(() => import('@/pages/doctor/ViewPatients'));
const DoctorAppointments = () => lazy_(() => import('@/pages/doctor/Appointments'));
const DoctorMedicalRecords = () => lazy_(() => import('@/pages/doctor/MedicalRecords'));
const DoctorPrescriptions = () => lazy_(() => import('@/pages/doctor/Prescriptions'));
const PatientAnswers = () => lazy_(() => import('@/pages/doctor/PatientAnswers'));
const SuggestQuestions = () => lazy_(() => import('@/pages/doctor/SuggestQuestions'));
const DoctorPlans = () => lazy_(() => import('@/pages/doctor/Plans'));
const MySubscription = () => lazy_(() => import('@/pages/doctor/MySubscription'));
const MyTimeSlots = () => lazy_(() => import('@/pages/doctor/TimeSlots'));
const DoctorInsurance = () => lazy_(() => import('@/pages/doctor/Insurance'));
const EscalatedTriage = () => lazy_(() => import('@/pages/doctor/EscalatedTriage'));
const DoctorPatientTimeline = () => lazy_(() => import('@/pages/doctor/PatientTimeline'));
const DoctorPharmacyOrders = () => lazy_(() => import('@/pages/doctor/PharmacyOrders'));
const DoctorFollowUps = () => lazy_(() => import('@/pages/doctor/FollowUps'));

// Admin pages
const AdminDashboard = () => lazy_(() => import('@/pages/admin/AdminDashboard'));
const AdminOrders = () => lazy_(() => import('@/pages/admin/Orders'));
const AdminBilling = () => lazy_(() => import('@/pages/admin/Billing'));
const AdminStats = () => lazy_(() => import('@/pages/admin/Stats'));
const AdminCharts = () => lazy_(() => import('@/pages/admin/Charts'));
const AdminAppointments = () => lazy_(() => import('@/pages/admin/Appointments'));
const AdminFollowUps = () => lazy_(() => import('@/pages/admin/FollowUps'));
const AdminDoctorPlans = () => lazy_(() => import('@/pages/admin/DoctorPlans'));
const AdminDoctorSubscriptions = () => lazy_(() => import('@/pages/admin/DoctorSubscriptions'));
const AdminDoctorTimeSlots = () => lazy_(() => import('@/pages/admin/DoctorTimeSlots'));
const AdminInsurance = () => lazy_(() => import('@/pages/admin/InsuranceAdmin'));
const AdminQuestions = () => lazy_(() => import('@/pages/admin/Questions'));
const DatabaseAdmin = () => lazy_(() => import('@/pages/admin/DatabaseAdmin'));
const TriageSessions = () => lazy_(() => import('@/pages/admin/TriageSessions'));
const TriageRules = () => lazy_(() => import('@/pages/admin/TriageRules'));
const AdminConsultationHistory = () => lazy_(() => import('@/pages/admin/ConsultationHistory'));
const AdminSupportTickets = () => lazy_(() => import('@/pages/admin/SupportTickets'));

export const router = createBrowserRouter([
  // Public landing page
  { path: '/', element: <LandingPage /> },
  { path: '/landing', element: <LandingPage /> },

  // Auth routes - Both use their own full-screen layouts
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // OAuth callback routes — backend redirects here with ?token=<jwt>
  { path: '/login-callback/google', element: <OAuthCallbackPage /> },
  { path: '/login-callback/facebook', element: <OAuthCallbackPage /> },

  // Shared error pages (no layout)
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <NotFoundPage /> },

  // Shared routes — accessible by any authenticated user regardless of role
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/profile', element: <ViewProfile /> },
      { path: '/profile/edit', element: <UpdateProfile /> },
    ],
  },

  // Patient routes
  {
    element: (
      <ProtectedRoute allowedRoles={['patient']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/patient/dashboard', element: <PatientDashboard /> },
      { path: '/patient/book-appointment', element: <BookAppointment /> },
      { path: '/patient/my-appointments', element: <MyAppointments /> },
      { path: '/patient/my-follow-ups', element: <MyFollowUps /> },
      { path: '/patient/health-programs', element: <PatientHealthPrograms /> },
      { path: '/patient/medical-records', element: <PatientMedicalRecords /> },
      { path: '/patient/prescriptions', element: <PatientPrescriptions /> },
      { path: '/patient/place-order', element: <PlaceOrder /> },
      { path: '/patient/my-orders', element: <MyOrders /> },
      { path: '/patient/answer-questions', element: <AnswerQuestions /> },
      { path: '/patient/my-answers', element: <MyAnswers /> },
      { path: '/patient/billing', element: <BillingPayments /> },
      { path: '/patient/payment-methods', element: <PaymentMethods /> },
      { path: '/patient/triage', element: <TriageAssess /> },
      { path: '/patient/triage-history', element: <TriageHistory /> },
      { path: '/patient/insurance', element: <PatientInsuranceRequests /> },
      { path: '/patient/support-tickets', element: <PatientSupportTickets /> },
      { path: '/patient/health-logs', element: <PatientHealthLogs /> },
      { path: '/patient/consultation-history', element: <PatientConsultationHistory /> },
      { path: '/patient/messages', element: <MessagesPage /> },
    ],
  },

  // Doctor routes
  {
    element: (
      <ProtectedRoute allowedRoles={['doctor']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/doctor/dashboard', element: <DoctorDashboard /> },
      { path: '/doctor/patients', element: <ViewPatients /> },
      { path: '/doctor/appointments', element: <DoctorAppointments /> },
      { path: '/doctor/follow-ups', element: <DoctorFollowUps /> },
      { path: '/doctor/medical-records', element: <DoctorMedicalRecords /> },
      { path: '/doctor/prescriptions', element: <DoctorPrescriptions /> },
      { path: '/doctor/patient-answers', element: <PatientAnswers /> },
      { path: '/doctor/suggest-questions', element: <SuggestQuestions /> },
      { path: '/doctor/plans', element: <DoctorPlans /> },
      { path: '/doctor/subscription', element: <MySubscription /> },
      { path: '/doctor/time-slots', element: <MyTimeSlots /> },
      { path: '/doctor/insurance', element: <DoctorInsurance /> },
      { path: '/doctor/triage-escalated', element: <EscalatedTriage /> },
      { path: '/doctor/patient-timeline', element: <DoctorPatientTimeline /> },
      { path: '/doctor/pharmacy-orders', element: <DoctorPharmacyOrders /> },
      { path: '/doctor/messages', element: <MessagesPage /> },
    ],
  },

  // Admin routes
  {
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/admin/dashboard', element: <AdminDashboard /> },
      { path: '/admin/orders', element: <AdminOrders /> },
      { path: '/admin/billing', element: <AdminBilling /> },
      { path: '/admin/stats', element: <AdminStats /> },
      { path: '/admin/charts', element: <AdminCharts /> },
      { path: '/admin/appointments', element: <AdminAppointments /> },
      { path: '/admin/follow-ups', element: <AdminFollowUps /> },
      { path: '/admin/doctor-plans', element: <AdminDoctorPlans /> },
      { path: '/admin/doctor-subscriptions', element: <AdminDoctorSubscriptions /> },
      { path: '/admin/doctor-time-slots', element: <AdminDoctorTimeSlots /> },
      { path: '/admin/insurance', element: <AdminInsurance /> },
      { path: '/admin/support-tickets', element: <AdminSupportTickets /> },
      { path: '/admin/messages', element: <MessagesPage /> },
      { path: '/admin/questions', element: <AdminQuestions /> },
      { path: '/admin/database', element: <DatabaseAdmin /> },
      { path: '/admin/triage-sessions', element: <TriageSessions /> },
      { path: '/admin/triage-rules', element: <TriageRules /> },
      { path: '/admin/consultation-history', element: <AdminConsultationHistory /> },
    ],
  },
]);
