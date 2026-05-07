# Document Verification Workflow & Stage Progression in NextTalent

## Overview
This document explains how document verification works and how candidates progress through stages, specifically the document verification → hiring partner → interview stage transitions.

---

## 1. Document Verification Approval Process

### Backend Endpoint
**Route**: `PUT /admin/candidates/:id/documents/:documentId/status`  
**Location**: [backend/routes/adminRoutes.js](backend/routes/adminRoutes.js#L21)  
**Controller**: [backend/controllers/adminController.js](backend/controllers/adminController.js#L793) - `updateCandidateDocumentStatus` function  
**Required Permission**: `documents:verify`

### How It Works

```javascript
// From updateCandidateDocumentStatus() in adminController.js
const updateCandidateDocumentStatus = async (req, res) => {
  // 1. Validate admin approval payload
  const reviewPayload = ensureReviewPayload(req, res);
  // Required: reasonNote, reviewConfirmed, evidenceViewed, sourcePage
  
  // 2. Validate document status
  const status = String(req.body?.status || '').trim();
  if (!validDocumentStatuses.includes(status)) {
    // Valid statuses: 'Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'
    return res.status(400).json({ message: 'Invalid document status' });
  }

  // 3. Find document and update status
  const document = await Document.findOne({ _id: req.params.documentId, userId: candidate._id });
  document.status = status;
  await document.save();

  // 4. Send email notification to candidate
  await sendStepUpdateEmail({
    to: candidate.email,
    heading: status === 'Accepted' ? 'Document approved' : 'Document needs revision',
    message: 'Your document has been approved/rejected',
    status: String(status || '').toLowerCase().replaceAll(' ', '_'),
    details: [
      { label: 'Document Type', value: document.documentType },
      { label: 'Status', value: status }
    ]
  });

  // 5. Create audit log & return progress
  const auditLog = await createApprovalAuditLog(req, {
    approvalType: 'document_verification',
    previousStatus,
    newStatus: status,
    reasonNote: reviewPayload.reasonNote
  });
};
```

**Valid Document Statuses**:
- `Pending` - Initial state
- `Uploaded` - Candidate has uploaded
- `Under Review` - Admin is reviewing
- `Accepted` - ✅ Approved and verified
- `Needs Revision` - Candidate must reupload

---

## 2. What Happens After Document Verification is Approved

### Stage Decision Endpoint
**Route**: `PUT /admin/candidates/:id/stage/:stageKey/decision`  
**Controller**: [backend/controllers/adminController.js](backend/controllers/adminController.js#L995) - `updateCandidateStageDecision` function

### When ALL documents are "Accepted", the admin approves the "document-verification" stage:

```javascript
// This endpoint is called to approve document-verification stage
router.put('/candidates/:id/stage/document-verification/decision', protect, adminOnly, requireAdminPermission('documents:verify'), updateCandidateStageDecision);

// Inside updateCandidateStageDecision():
if (stageKey === 'document-verification') {
  if (status === 'accepted') {
    // ✅ STAGE APPROVED - Move to next stage
    candidate.status = 'documents_received';  // Update user status
  } else if (status === 'under_review') {
    candidate.status = 'documents_submitted';
  }
}
```

### Data Changes on Approval:
```javascript
// In User model (stageStatuses Map)
candidate.stageStatuses.set('document-verification', 'accepted');
candidate.status = 'documents_received';  // User model status field
await candidate.save();
```

---

## 3. Stage Progression: Document Verification → Hiring Partner → Interviews

### Stage Flow Logic
**Location**: [backend/utils/candidateProgress.js](backend/utils/candidateProgress.js)

The progression is determined by:

1. **Document Verification Stage Status** - Read from `candidate.stageStatuses['document-verification']`
2. **Program Payment Status** - Program fee must be completed
3. **Hiring Partner Decision** - Must be accepted to move to interviews

### Stage Derivation Logic

```javascript
// From deriveAdminStageKey() in adminController.js

const deriveAdminStageKey = (snapshot) => {
  const { candidate, profile, hasInitial, hasProgram, hasFinal, docsUploaded, hasInterviews } = snapshot;
  
  // Read stage decisions from candidate.stageStatuses Map
  const documentVerificationDecision = readStageDecision(candidate, 'document-verification');
  const hiringDecision = readStageDecision(candidate, 'hiring');
  
  // === DOCUMENT VERIFICATION STAGE ===
  if (docsUploaded && hasProgram && documentVerificationDecision !== 'accepted') 
    return 'document-verification';  // ⏸️ Waiting for admin approval
  
  // === HIRING PARTNER STAGE ===
  if (docsUploaded && hasProgram && documentVerificationDecision === 'accepted' && hiringDecision !== 'accepted') 
    return 'hiring';  // ⏸️ After docs verified, await hiring partner assignment
  
  // ✅ If doc-verification AND hiring both accepted → move to interviews
  return null;  // Candidate can proceed to interviews
};
```

### Complete Stage Transition Sequence

```
1. DOCUMENTS_UPLOAD
   - Candidate uploads documents
   - Document statuses: 'Uploaded'

2. DOCUMENT_VERIFICATION (Admin reviews each document)
   - Admin updates each document status to 'Accepted'
   - When ALL documents: status = 'Accepted'
   - Admin approves 'document-verification' stage
   - candidate.status → 'documents_received'
   - candidate.stageStatuses['document-verification'] → 'accepted'

3. PROGRAM_PAYMENT (Automatic check - must be completed before hiring)
   - Program payment must be verified before hiring stage
   - If NOT paid: candidate stays in documents stage
   - If paid: candidate eligible for hiring

4. HIRING_PARTNER_STAGE (Admin assigns hiring partner)
   - Admin calls: PUT /admin/candidates/:id/stage/hiring/decision
   - Includes: { status: 'accepted', hiringPartner: 'Partner Name' }
   - Updates candidate.stageStatuses['hiring'] → 'accepted'
   - candidate.assignedHiringPartner → 'Partner Name'
   - candidate.status → 'sent_to_partners'

5. INTERVIEWS_STAGE
   - Admin schedules interview via: POST /admin/candidates/:id/interviews
   - Interview created with status 'Scheduled'
   - candidate.stageStatuses['interviews'] → 'under_review'
   - candidate.status → 'interview_scheduled'
```

---

## 4. Document Verification Related Files

### Backend Controllers
- **[backend/controllers/documentController.js](backend/controllers/documentController.js)** - Handles document uploads and basic status updates
  - `uploadDocument()` - Candidate uploads file
  - `updateDocumentStatus()` - Update individual document status
  - `getMyDocuments()` - Retrieve candidate's documents

- **[backend/controllers/adminController.js](backend/controllers/adminController.js#L793)** - Admin document verification approval
  - `updateCandidateDocumentStatus()` - Admin approves/rejects individual documents
  - `updateCandidateStageDecision()` - Admin approves the entire 'document-verification' stage

### Backend Models
- **[backend/models/Document.js](backend/models/Document.js)** - Document schema
  ```javascript
  {
    userId: ObjectId,
    documentType: String,
    fileUrl: String,
    status: {
      enum: ['Pending', 'Uploaded', 'Under Review', 'Accepted', 'Needs Revision'],
      default: 'Uploaded'
    },
    uploadedAt: Date,
    createdAt: Date,
    updatedAt: Date
  }
  ```

- **[backend/models/User.js](backend/models/User.js)** - User/Candidate schema
  ```javascript
  {
    stageStatuses: Map<String, String>,  // e.g., {'document-verification': 'accepted'}
    status: String,  // Overall status (documents_received, sent_to_partners, etc.)
    assignedHiringPartner: String,
    // ... other fields
  }
  ```

### Backend Routes
- **[backend/routes/documentRoutes.js](backend/routes/documentRoutes.js)** - Candidate document upload routes
  - `POST /documents/upload` - Upload document
  - `GET /documents/me` - Get my documents
  - `PUT /documents/:id/status` - Update document status

- **[backend/routes/adminRoutes.js](backend/routes/adminRoutes.js#L21)** - Admin approval routes
  - `PUT /admin/candidates/:id/documents/:documentId/status` - Verify individual document
  - `PUT /admin/candidates/:id/stage/document-verification/decision` - Approve document-verification stage
  - `PUT /admin/candidates/:id/stage/hiring/decision` - Approve hiring stage

### Backend Utilities
- **[backend/utils/candidateProgress.js](backend/utils/candidateProgress.js)** - Stage progression logic
  - `deriveCandidateProgress()` - Main function that determines current stage and next actions
  - Stage progression defined in `steps` array
  - Reads `documents` array and checks if all are 'Accepted'

---

## 5. candidateProgress.js - Stage Management Details

### Location
[backend/utils/candidateProgress.js](backend/utils/candidateProgress.js)

### Key Function: `deriveCandidateProgress()`

```javascript
const deriveCandidateProgress = ({ candidate, profile, eligibility, documents = [], interviews = [], payments = [], testimonial }) => {
  
  // === DETERMINE DOCUMENT STATUS ===
  const docsStatus = 
    !documents.length ? 'not_uploaded' :
    documents.some((d) => d.status === 'Needs Revision') ? 'needs_revision' :
    documents.every((d) => d.status === 'Accepted') ? 'verified' :  // ✅ ALL accepted
    documents.some((d) => d.status === 'Under Review') ? 'under_review' :
    'uploaded';
  
  // === PAYMENT STATUS ===
  const programPaymentStatus = paymentStatusLabel(payments, 'program');
  
  // === STAGE PROGRESSION LOGIC ===
  const steps = [
    // ... earlier stages ...
    
    {
      key: 'documents_upload',
      done: docsStatus !== 'not_uploaded',
      pendingFrom: docsStatus === 'not_uploaded' ? 'candidate' : 'completed',
      action: 'Upload required documents'
    },
    
    {
      key: 'program_payment',
      done: programPaymentStatus === 'verified',
      pendingFrom: programPaymentStatus === 'pending_verification' ? 'admin' : 
                   programPaymentStatus === 'verified' ? 'completed' : 'candidate',
      action: programPaymentStatus === 'pending_verification' ? 'Verify program payment' : 'Pay program fee'
    },
    
    {
      key: 'document_verification',
      done: docsStatus === 'verified',  // ✅ ALL documents must be 'Accepted'
      pendingFrom: docsStatus === 'verified' ? 'completed' : 
                   docsStatus === 'not_uploaded' ? 'candidate' : 'admin',  // Admin reviews
      action: docsStatus === 'not_uploaded' ? 'Upload documents' : 'Verify uploaded documents',
      recommendation: 'Review each document and update status'
    },
    
    {
      key: 'interviews',
      done: ['completed'].includes(interviewStatus),
      pendingFrom: interviewStatus === 'completed' ? 'completed' : 'admin',
      action: 'Schedule interview'
    },
    
    // ... later stages ...
  ];
  
  // Find first incomplete step (current stage)
  const current = steps.find((step) => !step.done) || { 
    key: 'completed', 
    pendingFrom: 'completed',
    action: 'No pending action'
  };
  
  // Return progress object
  return {
    currentStageKey: current.key,  // e.g., 'document_verification'
    currentStage: stageLabels[current.key],  // e.g., 'Document Verification'
    nextAction: current.action,  // e.g., 'Verify uploaded documents'
    pendingFrom: current.pendingFrom,  // 'admin', 'candidate', or 'completed'
    recommendedAdminAction: current.recommendation,
    documentStatus: docsStatus,  // 'verified', 'under_review', 'needs_revision', etc.
    // ... other fields ...
  };
};
```

### Stage Labels Mapping

```javascript
const stageLabels = {
  eligibility: 'Eligibility Applications',
  account: 'Account Created',
  profile_submitted: 'Profile Submitted',
  profile_review: 'Profile Review',
  initial_payment: 'Initial Payment',
  declaration: 'Declaration & Contract',
  documents_upload: 'Document Uploads',
  program_payment: 'Program Payment',        // ← Required before document_verification
  document_verification: 'Document Verification',
  hiring: 'Hiring Partner Stage',
  interviews: 'Interviews',
  selection: 'Selection Result',
  final_payment: 'Final Payment',
  testimonial: 'Testimonial',
  completed: 'Completed',
};
```

---

## 6. Issues That Prevent Moving to Next Stage

### Document Verification Blockers

#### Issue 1: Not All Documents Accepted
```javascript
// Blocker: Any document NOT 'Accepted' status
documents.some((d) => d.status !== 'Accepted')  // → docsStatus !== 'verified'

// Symptoms:
// - currentStageKey remains 'document_verification'
// - nextAction: 'Verify uploaded documents'
// - pendingFrom: 'admin'
// - Cannot move to 'hiring' stage
```

#### Issue 2: Program Payment Not Verified
```javascript
// From deriveAdminStageKey():
if (docsUploaded && hasProgram && documentVerificationDecision === 'accepted' && hiringDecision !== 'accepted') 
  return 'hiring';
  
// If hasProgram is FALSE:
// - No payment with type='program' and status='completed'
// - Admin cannot approve hiring stage until program payment verified
// - Candidate stuck at document_verification + program_payment pending
```

#### Issue 3: Document Status = "Needs Revision"
```javascript
// Blocker: Any document in 'Needs Revision'
documents.some((d) => d.status === 'Needs Revision')  // → docsStatus = 'needs_revision'

// Resolution: Candidate must reupload corrected document
// Admin updates status to 'Accepted' after reupload
```

### Code Example - Checking for Blockers

```javascript
// In adminController.js - before moving to hiring stage:

const buildCandidateSnapshot = ({ candidate, documents, payments }) => {
  const docsVerified = documents.length > 0 && documents.every((d) => d.status === 'Accepted');
  const hasProgram = Boolean(payments.find((p) => p.type === 'program' && p.status === 'completed'));
  
  return {
    documents,
    payments,
    docsVerified,
    hasProgram,
    // ❌ BLOCKER: docs verified but no program payment
    canMoveToHiring: docsVerified && hasProgram
  };
};
```

---

## 7. Email Notifications

When document verification is approved/rejected, candidate receives email:

```javascript
// From updateCandidateDocumentStatus() or updateCandidateStageDecision()

await sendStepUpdateEmail({
  to: candidate.email,
  candidateName: candidate.name || candidate.email?.split('@')[0],
  stepKey: 'document_verification',
  heading: status === 'Accepted' ? 'Document verification approved' : 'Document verification rejected',
  message: status === 'accepted' ? 'Your documents have been verified successfully.' : 'Your document verification status has been updated.',
  status,  // 'accepted', 'under_review', 'rejected'
  details: [
    { label: 'Stage', value: 'Document Verification' },
    { label: 'Decision', value: status }
  ],
  cta: { 
    label: 'Open Dashboard', 
    url: 'https://frontend.com/candidate-dashboard' 
  }
});
```

---

## 8. Summary Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   DOCUMENT VERIFICATION WORKFLOW                │
└─────────────────────────────────────────────────────────────────┘

1. UPLOAD STAGE (Candidate)
   ├─ Candidate uploads documents
   ├─ Document.status = 'Uploaded'
   └─ Progress: documents_upload (pending_from: 'admin')

2. VERIFICATION STAGE (Admin)
   ├─ Admin reviews each document individually
   ├─ Updates Document.status to 'Accepted' or 'Needs Revision'
   ├─ If 'Needs Revision': Candidate re-uploads → repeat
   └─ When ALL = 'Accepted': ✅ Ready for stage approval

3. STAGE APPROVAL (Admin)
   ├─ Endpoint: PUT /admin/candidates/:id/stage/document-verification/decision
   ├─ Request: { status: 'accepted', reasonNote: '...', reviewConfirmed: true }
   ├─ Updates:
   │  ├─ candidate.stageStatuses['document-verification'] = 'accepted'
   │  ├─ candidate.status = 'documents_received'
   │  └─ Audit log created
   └─ Send email to candidate

4. DEPENDENCY CHECK: Program Payment
   ├─ System checks if Payment.type='program' AND status='completed'
   └─ If not: Candidate stays in 'documents_received' state
      └─ Until program payment verified

5. HIRING PARTNER STAGE (Admin assigns)
   ├─ Endpoint: PUT /admin/candidates/:id/stage/hiring/decision
   ├─ Request: { status: 'accepted', hiringPartner: 'Partner Name' }
   ├─ Updates:
   │  ├─ candidate.stageStatuses['hiring'] = 'accepted'
   │  ├─ candidate.assignedHiringPartner = 'Partner Name'
   │  └─ candidate.status = 'sent_to_partners'
   └─ Send email to candidate

6. INTERVIEWS STAGE (Admin schedules)
   ├─ Endpoint: POST /admin/candidates/:id/interviews
   ├─ Creates Interview record
   ├─ Updates:
   │  ├─ candidate.stageStatuses['interviews'] = 'under_review'
   │  ├─ candidate.status = 'interview_scheduled'
   │  └─ Interview.status = 'Scheduled'
   └─ Send email with interview details
```

---

## Key Files Quick Reference

| File | Purpose | Key Function |
|------|---------|--------------|
| [documentController.js](backend/controllers/documentController.js) | Candidate document upload | `uploadDocument()`, `updateDocumentStatus()` |
| [adminController.js](backend/controllers/adminController.js#L793) | Admin approval workflows | `updateCandidateDocumentStatus()`, `updateCandidateStageDecision()` |
| [candidateProgress.js](backend/utils/candidateProgress.js) | Stage progression logic | `deriveCandidateProgress()` |
| [Document.js](backend/models/Document.js) | Document schema | Document status enum |
| [User.js](backend/models/User.js) | User/Candidate schema | `stageStatuses` Map field |
| [documentRoutes.js](backend/routes/documentRoutes.js) | Candidate document routes | Upload & retrieve documents |
| [adminRoutes.js](backend/routes/adminRoutes.js) | Admin approval endpoints | Verify documents, approve stages |
