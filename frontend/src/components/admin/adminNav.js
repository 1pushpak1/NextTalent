export const adminMainNav = [
  { label: 'Dashboard', to: '/admin/dashboard', requiredPermission: 'candidates:read' },
  { label: 'Candidates', to: '/admin/candidates', requiredPermission: 'candidates:read' },
  { label: 'Internal Evaluation', to: '/admin/evaluation', requiredPermission: 'evaluation:approve' },
  { label: 'Document Verification', to: '/admin/document-verification', requiredPermission: 'documents:verify' },
  { label: 'Hiring Partner Stage', to: '/admin/hiring', requiredPermission: 'candidates:update' },
  { label: 'Approve / Reject Profile', to: '/admin/operations/approvals', requiredRoles: ['operations_admin'] },
  { label: 'Interview Scheduling', to: '/admin/operations/interviews', requiredRoles: ['operations_admin'] },
  { label: 'Selection Results', to: '/admin/selection', requiredPermission: 'selection:publish' },
  { label: 'Testimonials', to: '/admin/testimonials', requiredPermission: 'candidates:read' },
];

export const adminPaymentNav = [
  { label: 'Overview', to: '/admin/payments', requiredPermission: 'payments:verify' },
  { label: 'Initial Payment ($500)', to: '/admin/payments/initial', requiredPermission: 'payments:verify' },
  { label: 'Program Payment (USD 3,100)', to: '/admin/payments/program', requiredPermission: 'payments:verify' },
  { label: 'Final Payment (USD 3,100)', to: '/admin/payments/final', requiredPermission: 'payments:verify' },
];
