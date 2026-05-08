const swaggerJSDoc = require('swagger-jsdoc');

const buildSwaggerSpec = (port = 5001) => {
  const options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'NextStep Talent API',
        version: '1.0.0',
        description:
          'API for the NextStep Talent international pathway platform. This API supports evaluation, eligibility checks, profile submission, payments, document workflows, interviews, and testimonials.',
      },
      servers: [
        {
          url: `http://localhost:${port}`,
          description: 'Local server',
        },
      ],
      tags: [
        { name: 'Health' },
        { name: 'Auth' },
        { name: 'Eligibility' },
        { name: 'Profile' },
        { name: 'Payments' },
        { name: 'Documents' },
        { name: 'Dashboard' },
        { name: 'Interviews' },
        { name: 'Testimonials' },
        { name: 'Admin' },
        { name: 'Approval Audit' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          ApiMessage: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              emailVerified: { type: 'boolean' },
              phoneVerified: { type: 'boolean' },
              role: { type: 'string', enum: ['candidate', 'admin'] },
              status: { type: 'string' },
            },
          },
          AuthResponse: {
            type: 'object',
            properties: {
              token: { type: 'string' },
              user: { $ref: '#/components/schemas/User' },
              message: { type: 'string' },
            },
          },
          Eligibility: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string', nullable: true },
              destination: { type: 'string' },
              country: { type: 'string' },
              hasITBackground: { type: 'boolean' },
              qualification: { type: 'string' },
              languageAnswer: { type: 'string' },
              currentLocation: { type: 'string' },
              willingToRelocate: { type: 'boolean', nullable: true },
              comfortableWithFees: { type: 'boolean', nullable: true },
              isEligible: { type: 'boolean' },
              rejectionReason: { type: 'string' },
              failedConditions: { type: 'array', items: { type: 'string' } },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Profile: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string', nullable: true },
              personalDetails: { type: 'object', additionalProperties: true },
              education: { type: 'object', additionalProperties: true },
              certifications: { type: 'array', items: { type: 'object', additionalProperties: true } },
              workExperience: { type: 'array', items: { type: 'object', additionalProperties: true } },
              skills: { type: 'object', additionalProperties: true },
              languages: { type: 'array', items: { type: 'object', additionalProperties: true } },
              additionalInfo: { type: 'string' },
              financialDisclosureAccepted: { type: 'boolean' },
              acknowledgementSigned: { type: 'boolean' },
              signature: { type: 'object', additionalProperties: true },
              generatedPdfUrl: { type: 'string' },
              status: { type: 'string', enum: ['submitted', 'under_review', 'accepted', 'rejected'] },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Payment: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              type: { type: 'string', enum: ['initial', 'program', 'final'] },
              amount: { type: 'number' },
              currency: { type: 'string' },
              method: { type: 'string' },
              status: { type: 'string' },
              transactionId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          Document: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              documentType: { type: 'string' },
              fileUrl: { type: 'string' },
              status: {
                type: 'string',
                enum: ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'],
              },
              uploadedAt: { type: 'string', format: 'date-time' },
            },
          },
          Interview: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              hiringPartner: { type: 'string' },
              country: { type: 'string' },
              role: { type: 'string' },
              date: { type: 'string' },
              time: { type: 'string' },
              meetingLink: { type: 'string' },
              status: { type: 'string' },
            },
          },
          Testimonial: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              fullName: { type: 'string' },
              country: { type: 'string' },
              selectedDestination: { type: 'string' },
              role: { type: 'string' },
              text: { type: 'string' },
              photoUrl: { type: 'string' },
              consent: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          ApprovalAuditLog: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              candidateId: { type: 'string' },
              approvalType: { type: 'string' },
              previousStatus: { type: 'string' },
              newStatus: { type: 'string' },
              decision: { type: 'string' },
              reasonNote: { type: 'string' },
              adminRole: { type: 'string' },
              adminName: { type: 'string' },
              adminEmail: { type: 'string' },
              ipAddress: { type: 'string' },
              userAgent: { type: 'string' },
              sourcePage: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      paths: {
        '/': {
          get: {
            tags: ['Health'],
            summary: 'Backend root info',
            responses: {
              200: { description: 'Root status response' },
            },
          },
        },
        '/api/health': {
          get: {
            tags: ['Health'],
            summary: 'Health check',
            responses: {
              200: {
                description: 'API is healthy',
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { ok: { type: 'boolean' } } },
                  },
                },
              },
            },
          },
        },
        '/api/auth/signup': {
          post: {
            tags: ['Auth'],
            summary: 'Create candidate account',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password', 'confirmPassword'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string' },
                      confirmPassword: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Signup successful',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
                },
              },
            },
          },
        },
        '/api/auth/login': {
          post: {
            tags: ['Auth'],
            summary: 'Login',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: 'Login successful',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
                },
              },
            },
          },
        },
        '/api/auth/verify-email': {
          post: {
            tags: ['Auth'],
            summary: 'Simulate email verification',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email'],
                    properties: { email: { type: 'string', format: 'email' } },
                  },
                },
              },
            },
            responses: {
              200: {
                description: 'Email verified',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { message: { type: 'string' }, user: { $ref: '#/components/schemas/User' } },
                    },
                  },
                },
              },
            },
          },
        },
        '/api/auth/send-phone-otp': {
          post: {
            tags: ['Auth'],
            summary: 'Simulate sending phone OTP',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'countryCode', 'phone'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      countryCode: { type: 'string' },
                      phone: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'OTP sent (simulated)' },
            },
          },
        },
        '/api/auth/verify-phone': {
          post: {
            tags: ['Auth'],
            summary: 'Verify phone OTP',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'otp'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      otp: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Phone verified' },
            },
          },
        },
        '/api/eligibility/check': {
          post: {
            tags: ['Eligibility'],
            summary: 'Run eligibility logic and save response',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: [
                      'destination',
                      'country',
                      'hasITBackground',
                      'languageAnswer',
                      'currentLocation',
                      'email',
                    ],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      destination: { type: 'string' },
                      country: { type: 'string' },
                      hasITBackground: { type: 'boolean' },
                      qualification: { type: 'string' },
                      languageAnswer: { type: 'string' },
                      currentLocation: { type: 'string' },
                      willingToRelocate: { type: 'boolean' },
                      comfortableWithFees: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Eligibility response saved',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Eligibility' } },
                },
              },
            },
          },
        },
        '/api/eligibility/{id}': {
          get: {
            tags: ['Eligibility'],
            summary: 'Get eligibility result by ID',
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            responses: {
              200: {
                description: 'Eligibility record',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Eligibility' } },
                },
              },
            },
          },
        },
        '/api/profile': {
          post: {
            tags: ['Profile'],
            summary: 'Submit profile for evaluation',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['personalDetails', 'education', 'financialDisclosureAccepted', 'acknowledgementSigned', 'signature'],
                    properties: {
                      personalDetails: { type: 'object', additionalProperties: true },
                      education: { type: 'object', additionalProperties: true },
                      certifications: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      workExperience: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      skills: { type: 'object', additionalProperties: true },
                      languages: { type: 'array', items: { type: 'object', additionalProperties: true } },
                      additionalInfo: { type: 'string' },
                      financialDisclosureAccepted: { type: 'boolean' },
                      acknowledgementSigned: { type: 'boolean' },
                      signature: { type: 'object', additionalProperties: true },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Profile submitted',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Profile' } },
                },
              },
            },
          },
        },
        '/api/profile/me': {
          get: {
            tags: ['Profile'],
            summary: 'Get current user profile',
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: 'Current profile (or null)' },
            },
          },
          put: {
            tags: ['Profile'],
            summary: 'Update current user profile',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true },
                },
              },
            },
            responses: {
              200: { description: 'Updated profile' },
            },
          },
        },
        '/api/profile/generate-pdf': {
          post: {
            tags: ['Profile'],
            summary: 'Generate profile PDF placeholder',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Generated PDF URL',
                content: {
                  'application/json': {
                    schema: { type: 'object', properties: { pdfUrl: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
        '/api/payments/create': {
          post: {
            tags: ['Payments'],
            summary: 'Create payment intent placeholder',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['type'],
                    properties: {
                      type: { type: 'string', enum: ['initial', 'program', 'final'] },
                      method: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Mock payment intent created' },
            },
          },
        },
        '/api/payments/confirm': {
          post: {
            tags: ['Payments'],
            summary: 'Confirm payment and persist',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['type'],
                    properties: {
                      type: { type: 'string', enum: ['initial', 'program', 'final'] },
                      method: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Payment saved',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Payment' } },
                },
              },
            },
          },
        },
        '/api/payments/me': {
          get: {
            tags: ['Payments'],
            summary: 'Get current user payments',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Payments list',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } },
                  },
                },
              },
            },
          },
        },
        '/api/documents/upload': {
          post: {
            tags: ['Documents'],
            summary: 'Upload a document',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'multipart/form-data': {
                  schema: {
                    type: 'object',
                    required: ['documentType', 'file'],
                    properties: {
                      documentType: { type: 'string' },
                      file: { type: 'string', format: 'binary' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Document uploaded',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Document' } },
                },
              },
            },
          },
        },
        '/api/documents/me': {
          get: {
            tags: ['Documents'],
            summary: 'Get current user documents',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Document list',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/Document' } },
                  },
                },
              },
            },
          },
        },
        '/api/documents/{id}/status': {
          put: {
            tags: ['Documents'],
            summary: 'Update document status',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status'],
                    properties: {
                      status: {
                        type: 'string',
                        enum: ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'],
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Document status updated' },
            },
          },
        },
        '/api/dashboard/me': {
          get: {
            tags: ['Dashboard'],
            summary: 'Get candidate dashboard summary',
            security: [{ bearerAuth: [] }],
            responses: {
              200: { description: 'Dashboard payload' },
            },
          },
        },
        '/api/dashboard/me/status': {
          put: {
            tags: ['Dashboard'],
            summary: 'Update current user status',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status'],
                    properties: { status: { type: 'string' } },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Status updated' },
            },
          },
        },
        '/api/interviews/me': {
          get: {
            tags: ['Interviews'],
            summary: 'Get current user interviews',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Interview list',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/Interview' } },
                  },
                },
              },
            },
          },
        },
        '/api/interviews': {
          post: {
            tags: ['Interviews'],
            summary: 'Create interview (admin placeholder)',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['userId', 'hiringPartner', 'country', 'role', 'date', 'time'],
                    properties: {
                      userId: { type: 'string' },
                      hiringPartner: { type: 'string' },
                      country: { type: 'string' },
                      role: { type: 'string' },
                      date: { type: 'string' },
                      time: { type: 'string' },
                      meetingLink: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Interview created',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Interview' } },
                },
              },
            },
          },
        },
        '/api/testimonials': {
          post: {
            tags: ['Testimonials'],
            summary: 'Submit testimonial',
            security: [{ bearerAuth: [] }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['fullName', 'country', 'selectedDestination', 'role', 'text', 'consent'],
                    properties: {
                      fullName: { type: 'string' },
                      country: { type: 'string' },
                      selectedDestination: { type: 'string' },
                      role: { type: 'string' },
                      text: { type: 'string' },
                      photoUrl: { type: 'string' },
                      consent: { type: 'boolean' },
                    },
                  },
                },
              },
            },
            responses: {
              201: {
                description: 'Testimonial saved',
                content: {
                  'application/json': { schema: { $ref: '#/components/schemas/Testimonial' } },
                },
              },
            },
          },
          get: {
            tags: ['Testimonials'],
            summary: 'List testimonials',
            responses: {
              200: {
                description: 'Testimonials list',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/Testimonial' } },
                  },
                },
              },
            },
          },
        },
        '/api/admin/candidates': {
          get: {
            tags: ['Admin'],
            summary: 'List candidates (admin)',
            security: [{ bearerAuth: [] }],
            responses: {
              200: {
                description: 'Candidates list',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                  },
                },
              },
            },
          },
        },
        '/api/admin/candidates/{id}/status': {
          put: {
            tags: ['Admin'],
            summary: 'Update candidate status (admin)',
            security: [{ bearerAuth: [] }],
            parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status'],
                    properties: { status: { type: 'string' } },
                  },
                },
              },
            },
            responses: {
              200: { description: 'Candidate status updated' },
            },
          },
        },
      },
    },
    apis: [],
  };

  return swaggerJSDoc(options);
};

module.exports = buildSwaggerSpec;
