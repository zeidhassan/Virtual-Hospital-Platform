// src/routes/supportTickets.js
const express = require('express');
const router = express.Router();

const ctrl = require('../../controllers/supportTickets/supportTicketsController');
const verifyToken = require('../../middleware/verifyToken');            // JWT -> req.user
const requireRole = require('../../middleware/requireRole');            // e.g., requireRole('patient')
const { uploadSupportTicket } = require('../../middleware/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Support Tickets
 *     description: Patient & Doctor ticket operations
 *   - name: Support Tickets (Admin)
 *     description: Admin-only operations on tickets
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     SupportTicket:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         user_id: { type: integer }
 *         category: { type: string, enum: [Technical, Medical, Billing, Appointments, Other] }
 *         subject: { type: string }
 *         description: { type: string }
 *         status: { type: string, enum: [pending, open, in progress, resolved, closed] }
 *         file_url: { type: string, nullable: true }
 *         doctor_assigned: { type: integer, nullable: true }
 *         patient_assigned: { type: integer, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 *     SupportTicketReply:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         ticket_id: { type: integer }
 *         user_id: { type: integer }
 *         message: { type: string }
 *         file_url: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *     TicketCreatePayload:
 *       type: object
 *       required: [subject, description]
 *       properties:
 *         category:
 *           type: string
 *           enum: [Technical, Medical, Billing, Appointments, Other]
 *           default: Other
 *         subject: { type: string, minLength: 3, maxLength: 100 }
 *         description: { type: string, minLength: 5 }
 *         file_url: { type: string, nullable: true }
 *         status:
 *           type: string
 *           enum: [pending, open, in progress, resolved, closed]
 *           default: open
 *         # admin may pass doctor_assigned / patient_assigned in adminCreate
 *         doctor_assigned: { type: integer, nullable: true }
 *         patient_assigned: { type: integer, nullable: true }
 *     ReplyCreatePayload:
 *       type: object
 *       required: [message]
 *       properties:
 *         message: { type: string, minLength: 2 }
 *         file_url: { type: string, nullable: true }
 *     AssignPayload:
 *       type: object
 *       properties:
 *         doctor_assigned: { type: integer, nullable: true }
 *         patient_assigned: { type: integer, nullable: true }
 *     StatusUpdatePayload:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [pending, open, in progress, resolved, closed]
 */

/* =========================
 * Patient routes
 * ========================= */

/**
 * @swagger
 * /api/support-tickets/patient:
 *   get:
 *     summary: List tickets assigned to the authenticated patient
 *     tags: [Support Tickets]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sort
 *         description: e.g. -created_at, +updated_at
 *         schema: { type: string, default: "-created_at" }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, open, in progress, resolved, closed] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Technical, Medical, Billing, Appointments, Other] }
 *       - in: query
 *         name: subject
 *         schema: { type: string }
 *       - in: query
 *         name: description
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of assigned tickets
 */
router.get(
  '/patient',
  verifyToken,
  requireRole('patient'),
  ctrl.getAllPatientTickets
);

/**
 * @swagger
 * /api/support-tickets/patient:
 *   post:
 *     summary: Patient creates a ticket (auto-linked to their patient profile)
 *     tags: [Support Tickets]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TicketCreatePayload' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SupportTicket' }
 */
router.post(
  '/patient',
  verifyToken,
  requireRole('patient'),
  uploadSupportTicket.single('file'),
  ctrl.patientCreateTicket
);

/**
 * @swagger
 * /api/support-tickets/patient/{id}/replies:
 *   post:
 *     summary: Patient replies to a ticket (creator or assigned patient)
 *     tags: [Support Tickets]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReplyCreatePayload' }
 *     responses:
 *       201:
 *         description: Reply created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SupportTicketReply' }
 */
router.post(
  '/patient/:id/reply',
  verifyToken,
  requireRole('patient'),
  ctrl.patientReply
);

/* =========================
 * Doctor routes
 * ========================= */

/**
 * @swagger
 * /api/support-tickets/doctor:
 *   get:
 *     summary: List tickets assigned to the authenticated doctor
 *     tags: [Support Tickets]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: "-created_at" }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, open, in progress, resolved, closed] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Technical, Medical, Billing, Appointments, Other] }
 *       - in: query
 *         name: subject
 *         schema: { type: string }
 *       - in: query
 *         name: description
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of assigned tickets
 */
router.get(
  '/doctor',
  verifyToken,
  requireRole('doctor'),
  ctrl.getAllDoctorTickets
);

/**
 * @swagger
 * /api/support-tickets/doctor:
 *   post:
 *     summary: Doctor creates a ticket (auto-linked to their doctor profile)
 *     tags: [Support Tickets]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TicketCreatePayload' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SupportTicket' }
 */
router.post(
  '/doctor',
  verifyToken,
  requireRole('doctor'),
  uploadSupportTicket.single('file'),
  ctrl.doctorCreateTicket
);

/**
 * @swagger
 * /api/support-tickets/doctor/{id}/replies:
 *   post:
 *     summary: Doctor replies to a ticket (creator or assigned doctor)
 *     tags: [Support Tickets]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReplyCreatePayload' }
 *     responses:
 *       201:
 *         description: Reply created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SupportTicketReply' }
 */
router.post(
  '/doctor/:id/reply',
  verifyToken,
  requireRole('doctor'),
  ctrl.doctorReply
);

/* =========================
 * Admin routes
 * ========================= */

/**
 * @swagger
 * /api/adminBoard/support-tickets:
 *   get:
 *     summary: Admin list all tickets (with filters)
 *     tags: [Support Tickets (Admin)]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: "-created_at" }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, open, in progress, resolved, closed] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [Technical, Medical, Billing, Appointments, Other] }
 *       - in: query
 *         name: user_id
 *         schema: { type: integer }
 *       - in: query
 *         name: doctor_assigned
 *         schema: { type: integer }
 *       - in: query
 *         name: patient_assigned
 *         schema: { type: integer }
 *       - in: query
 *         name: subject
 *         schema: { type: string }
 *       - in: query
 *         name: description
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list
 */
router.get(
  '/admin',
  verifyToken,
  requireRole('admin'),
  ctrl.getAllAdminTickets
);

/**
 * @swagger
 * /api/adminBoard/support-tickets:
 *   post:
 *     summary: Admin creates a ticket (optional immediate assignment)
 *     tags: [Support Tickets (Admin)]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/TicketCreatePayload' }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/admin',
  verifyToken,
  requireRole('admin'),
  uploadSupportTicket.single('file'),
  ctrl.adminCreateTicket
);

/**
 * @swagger
 * /api/adminBoard/support-tickets/{id}/assign:
 *   patch:
 *     summary: Admin assigns a ticket to doctor/patient
 *     tags: [Support Tickets (Admin)]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/AssignPayload' }
 *     responses:
 *       200:
 *         description: Updated ticket
 */
router.patch(
  '/admin/:id/assign',
  verifyToken,
  requireRole('admin'),
  ctrl.adminAssign
);

/**
 * @swagger
 * /api/adminBoard/support-tickets/{id}/replies:
 *   post:
 *     summary: Admin replies to a ticket
 *     tags: [Support Tickets (Admin)]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ReplyCreatePayload' }
 *     responses:
 *       201:
 *         description: Reply created
 */
router.post(
  '/admin/:id/reply',
  verifyToken,
  requireRole('admin'),
  ctrl.adminReply
);

/* =========================
 * Shared: status update
 * ========================= */

/**
 * @swagger
 * /api/support-tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status (admin; assigned doctor; or creator can close own)
 *     tags: [Support Tickets]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/StatusUpdatePayload' }
 *     responses:
 *       200:
 *         description: Updated ticket
 */
router.patch(
  '/:id/status',
  verifyToken, // controller enforces fine-grained permission
  ctrl.updateTicketStatus
);

// In src/routes/supportTickets.js
router.get(
  '/:id/replies',
  verifyToken,                // no role gate here; controller enforces fine-grained access
  ctrl.getTicketReplies
);


module.exports = router;
