# Document Verification Stage Progression - Code Flow Examples

## 1. Admin Approves Individual Documents

```javascript
// Endpoint: PUT /admin/candidates/:id/documents/:documentId/status
// Required Permission: documents:verify

// REQUEST BODY:
{
  "documentId": "doc123",
  "status": "Accepted",  // or "Needs Revision"
  "reasonNote": "All documents appear valid and authentic",
  "reviewConfirmed": true,
  "evidenceViewed": true,
  "sourcePage": "documents-page"
}

// RESPONSE:
{
  "document": {
    "_id": "doc123",
    "userId": "user456",
    "documentType": "Passport",
    "fileUrl": "/uploads/documents/...",
    "status": "Accepted",  // ✅ Updated
    "uploadedAt": "2026-05-01T10:00:00Z",
    "updatedAt": "2026-05-07T14:30:00Z"
  },
  "auditLog": {
    "candidateId": "user456",
    "approvalType": "document_verification",
    "previousStatus": "Under Review",
    "newStatus": "Accepted",
    "reasonNote": "All documents appear valid and authentic",
    "approvedBy": "admin@nextalent.com"
  },
  "progress": {
    "currentStageKey": "document_verification",
    "currentStage": "Document Verification",
    "nextAction": "Verify uploaded documents",
    "documentStatus": "under_review",  // Still checking other docs
    "pendingFrom": "admin",
    "recommendedAdminAction": "Review each document and update status"
  }
}

// EMAIL SENT TO CANDIDATE:
{
  "to": "candidate@email.com",
  "subject": "Document Status Updated",
  "heading": "Document approved",
  "message": "Your document has been approved successfully.",
  "details": [
    { "label": "Document Type", "value": "Passport" },
    { "label": "Status", "value": "Accepted" }
  ]
}
```

---

## 2. Admin Approves Entire Document Verification Stage

Once ALL documents are 'Accepted', admin can approve the stage:

```javascript
// Endpoint: PUT /admin/candidates/:id/stage/document-verification/decision
// Required Permission: documents:verify

// REQUEST BODY:
{
  "status": "accepted",  // 'accepted', 'rejected', 'under_review'
  "reasonNote": "All 5 documents have been reviewed and verified. Candidate is eligible to proceed to hiring stage.",
  "reviewConfirmed": true,
  "evidenceViewed": true,
  "sourcePage": "candidates-document-verification-page"
}

// DATABASE UPDATES:
// 1. User record updated:
{
  "_id": "user456",
  "stageStatuses": {
    "evaluation": "accepted",
    "declaration": "accepted",
    "document-verification": "accepted"  // ✅ SET TO 'accepted'
  },
  "status": "documents_received"  // ✅ UPDATED
}

// 2. Audit log created:
{
  "candidateId": "user456",
  "candidateEmail": "candidate@email.com",
  "approvalType": "document_verification",
  "sectionRecordId": "document-verification",
  "previousStatus": "under_review",
  "newStatus": "accepted",
  "reasonNote": "All 5 documents have been reviewed and verified...",
  "sourcePage": "candidates-document-verification-page",
  "approvedBy": "admin@nextalent.com",
  "approvedAt": "2026-05-07T15:00:00Z"
}

// RESPONSE:
{
  "candidateId": "user456",
  "stageKey": "document-verification",
  "status": "accepted",
  "stageStatuses": {
    "evaluation": "accepted",
    "declaration": "accepted",
    "document-verification": "accepted"
  },
  "auditLog": { /* as shown above */ },
  "progress": {
    "currentStageKey": "hiring",  // ✅ MOVED TO HIRING (if program payment done)
    "currentStage": "Hiring Partner Stage",
    "nextAction": "Assign to hiring partner",
    "pendingFrom": "admin",
    "recommendedAdminAction": "Assign candidate to a hiring partner"
  }
}

// EMAIL SENT TO CANDIDATE:
{
  "to": "candidate@email.com",
  "subject": "Document Verification Approved",
  "heading": "Document verification approved",
  "message": "Your documents have been verified successfully.",
  "details": [
    { "label": "Stage", "value": "Document Verification" },
    { "label": "Decision", "value": "accepted" }
  ],
  "cta": {
    "label": "Open Dashboard",
    "url": "https://app.nextalent.com/candidate-dashboard"
  }
}
```

---

## 3. Next: Admin Assigns Hiring Partner

```javascript
// Endpoint: PUT /admin/candidates/:id/stage/hiring/decision
// Required Permission: candidates:update

// REQUEST BODY:
{
  "status": "accepted",
  "hiringPartner": "TechCorp India",  // ✅ REQUIRED when approving hiring stage
  "reasonNote": "Candidate meets all requirements. Assigned to TechCorp for interview rounds.",
  "reviewConfirmed": true,
  "evidenceViewed": true,
  "sourcePage": "candidates-hiring-page"
}

// DATABASE UPDATES:
// 1. User record updated:
{
  "_id": "user456",
  "stageStatuses": {
    "evaluation": "accepted",
    "declaration": "accepted",
    "document-verification": "accepted",
    "hiring": "accepted"  // ✅ SET TO 'accepted'
  },
  "status": "sent_to_partners",  // ✅ UPDATED
  "assignedHiringPartner": "TechCorp India"  // ✅ SET
}

// RESPONSE:
{
  "candidateId": "user456",
  "stageKey": "hiring",
  "status": "accepted",
  "stageStatuses": {
    "evaluation": "accepted",
    "declaration": "accepted",
    "document-verification": "accepted",
    "hiring": "accepted"  // ✅ Approved
  },
  "auditLog": { /* hiring approval logged */ },
  "progress": {
    "currentStageKey": "interviews",  // ✅ NEXT STAGE
    "currentStage": "Interviews",
    "nextAction": "Schedule interview",
    "pendingFrom": "admin",
    "recommendedAdminAction": "Coordinate with hiring partner and update interview status"
  }
}

// EMAIL SENT TO CANDIDATE:
{
  "to": "candidate@email.com",
  "subject": "Hiring Partner Assignment",
  "heading": "Assigned to hiring partner",
  "message": "Your profile has been sent to your assigned hiring partner for interviews.",
  "details": [
    { "label": "Stage", "value": "Hiring Partner Stage" },
    { "label": "Hiring Partner", "value": "TechCorp India" },
    { "label": "Decision", "value": "accepted" }
  ]
}
```

---

## 4. Finally: Admin Schedules Interview

```javascript
// Endpoint: POST /admin/candidates/:id/interviews
// Required Permission: interviews:manage

// REQUEST BODY:
{
  "hiringPartner": "TechCorp India",
  "country": "India",
  "role": "Senior Software Engineer",
  "date": "2026-05-15",
  "time": "10:00 AM IST",
  "meetingLink": "https://teams.microsoft.com/l/meetup-join/..."
}

// DATABASE UPDATES:
// 1. Interview record created:
{
  "_id": "interview789",
  "userId": "user456",
  "hiringPartner": "TechCorp India",
  "country": "India",
  "role": "Senior Software Engineer",
  "date": "2026-05-15",
  "time": "10:00 AM IST",
  "meetingLink": "https://teams.microsoft.com/...",
  "status": "Scheduled",  // ✅ CREATED
  "createdAt": "2026-05-07T15:30:00Z"
}

// 2. User record updated:
{
  "_id": "user456",
  "stageStatuses": {
    "evaluation": "accepted",
    "declaration": "accepted",
    "document-verification": "accepted",
    "hiring": "accepted",
    "interviews": "under_review"  // ✅ SET
  },
  "status": "interview_scheduled"  // ✅ UPDATED
}

// RESPONSE:
{
  "_id": "interview789",
  "userId": "user456",
  "status": "Scheduled",
  "date": "2026-05-15",
  "time": "10:00 AM IST",
  "meetingLink": "https://teams.microsoft.com/l/meetup-join/..."
}

// EMAIL SENT TO CANDIDATE:
{
  "to": "candidate@email.com",
  "subject": "Interview Scheduled",
  "heading": "Interview scheduled",
  "message": "Your interview details are now available on your dashboard.",
  "details": [
    { "label": "Hiring Partner", "value": "TechCorp India" },
    { "label": "Role", "value": "Senior Software Engineer" },
    { "label": "Date", "value": "2026-05-15" },
    { "label": "Time", "value": "10:00 AM IST" }
  ],
  "cta": {
    "label": "View Interviews",
    "url": "https://app.nextalent.com/interviews"
  }
}
```

---

## 5. Error Scenarios & How They Occur

### Scenario A: Trying to Approve Doc Verification When Documents Not All Accepted

```javascript
// If documents array contains:
[
  { documentType: "Passport", status: "Accepted" },
  { documentType: "Resume", status: "Under Review" },  // ❌ NOT Accepted
  { documentType: "Education Certificate", status: "Accepted" }
]

// Admin tries to approve stage:
PUT /admin/candidates/:id/stage/document-verification/decision
{ "status": "accepted" }

// System Check (from candidateProgress.js):
const docsStatus = documents.every((d) => d.status === 'Accepted') ? 'verified' : 'under_review';
// Result: 'under_review' (NOT 'verified')

// Response from progress calculation:
{
  "currentStageKey": "document_verification",
  "currentStage": "Document Verification",
  "documentStatus": "under_review",
  "nextAction": "Verify uploaded documents",
  "pendingFrom": "admin",
  "recommendedAdminAction": "Review each document and update status"
}
```

### Scenario B: Program Payment Not Verified

```javascript
// After doc-verification is approved:
// candidate.stageStatuses['document-verification'] = 'accepted'
// candidate.status = 'documents_received'

// But Program Payment status is:
payments = [
  { type: 'initial', status: 'completed', amount: 500 },
  { type: 'program', status: 'pending' }  // ❌ NOT completed
]

// System Check (from adminController.js deriveAdminStageKey()):
const hasProgram = Boolean(payments.find((p) => p.type === 'program' && p.status === 'completed'));
// Result: false

// So:
if (docsUploaded && hasProgram && documentVerificationDecision === 'accepted' && hiringDecision !== 'accepted') 
  return 'hiring';  // ❌ FAILS - hasProgram is false

// Candidate STAYS in document_verification stage
// Next Action: "Verify program payment" (admin must verify payment receipt)
```

### Scenario C: No Hiring Partner Assigned

```javascript
// Admin tries to approve hiring stage:
PUT /admin/candidates/:id/stage/hiring/decision
{
  "status": "accepted"
  // ❌ Missing: hiringPartner
}

// Backend validation (from updateCandidateStageDecision):
if (stageKey === 'hiring') {
  if (status === 'accepted') {
    if (!hiringPartner) {
      return res.status(400).json({ message: 'Hiring partner is required' });
    }
  }
}

// Response:
{
  "status": 400,
  "message": "Hiring partner is required"
}
```

---

## 6. Complete State Transition Timeline

```
TIME  ACTOR      ACTION                              USER.STATUS          STAGE_STATUSES
────  ──────────  ─────────────────────────────────  ─────────────────────  ────────────────
T0    Candidate  Creates account                    account_created       {}
T1    Candidate  Submits profile                    profile_submitted      {}
T2    Admin      Approves profile                   accepted               { evaluation: 'accepted' }
T3    Candidate  Signs declaration                  declaration_signed     { evaluation: 'accepted', declaration: 'accepted' }
T4    Candidate  Pays initial fee                   (program_payment_complete set via Payment)
T5    Candidate  Uploads documents (5 files)        documents_submitted    { ..., document-verification: pending }
      Each file: { status: 'Uploaded' }

T6    Admin      Reviews doc #1 → Accepted          documents_submitted    (no change yet)
T7    Admin      Reviews doc #2 → Accepted          documents_submitted    
T8    Admin      Reviews doc #3 → Accepted          documents_submitted    
T9    Admin      Reviews doc #4 → Accepted          documents_submitted    
T10   Admin      Reviews doc #5 → Accepted          documents_submitted    ✅ ALL Accepted now
      All docs: { status: 'Accepted' }

T11   Admin      Approves doc-verification stage    documents_received     { ..., document-verification: 'accepted' }
      [Also verified program payment exists]

T12   Admin      Assigns hiring partner             sent_to_partners       { ..., hiring: 'accepted', interviews: pending }
      assignedHiringPartner = 'TechCorp India'

T13   Admin      Schedules interview                interview_scheduled    { ..., interviews: 'under_review' }
      Interview.status = 'Scheduled'

T14   Candidate  Completes interview                interview_completed    (via status update)
      Interview.status = 'Completed'

T15   Admin      Marks interview complete           interview_completed    { ..., interviews: 'accepted' }

T16   Admin      Publishes selection                selected               { ..., selection: 'accepted' }

T17   Candidate  Pays final fee                     final_payment_complete
      Final Payment.status = 'completed'

T18   Candidate  Submits testimonial                process_complete       { ..., testimonials: 'accepted' }
      
────────────────────────────────────────────────────────────────────────────────────────────
✅ COMPLETION: All stages approved, all payments verified, process complete
```

---

## 7. Key Functions Reference

### From adminController.js
```javascript
// Line ~119: Read a stage decision
const readStageDecision = (candidate, stageKey) => {
  const source = candidate?.stageStatuses;
  if (!source || !stageKey) return 'pending';
  return String(source.get?.(stageKey) || source[stageKey] || 'pending').toLowerCase();
};

// Line ~193: Determine current admin stage for candidate
const deriveAdminStageKey = (snapshot) => { /* ... */ };

// Line ~995: Main function to approve/reject a stage
const updateCandidateStageDecision = async (req, res) => { /* ... */ };

// Line ~793: Approve individual document
const updateCandidateDocumentStatus = async (req, res) => { /* ... */ };
```

### From candidateProgress.js
```javascript
// Main export: Derives current stage and next actions
const deriveCandidateProgress = ({ candidate, profile, eligibility, documents, interviews, payments, testimonial }) => {
  // Returns: { currentStageKey, currentStage, nextAction, documentStatus, ... }
};
```

---

## 8. Quick Checklist for Approving Document Verification

✅ **Prerequisites:**
- [ ] All documents uploaded by candidate
- [ ] Candidate completed program payment
- [ ] Admin has permission: `documents:verify`

✅ **Step 1: Review Individual Documents**
- [ ] Review each document type individually
- [ ] Confirm authenticity and completeness
- [ ] Update Document.status to 'Accepted' for each
- [ ] Call: `PUT /admin/candidates/:id/documents/:documentId/status`

✅ **Step 2: Approve Stage**
- [ ] Confirm ALL documents are 'Accepted' status
- [ ] Provide reason note explaining approval
- [ ] Call: `PUT /admin/candidates/:id/stage/document-verification/decision`
- [ ] Input: `{ status: 'accepted', reasonNote: '...', reviewConfirmed: true, evidenceViewed: true }`

✅ **Step 3: Assign Hiring Partner**
- [ ] Candidate should appear in "Hiring Partner Stage" 
- [ ] Select appropriate hiring partner
- [ ] Call: `PUT /admin/candidates/:id/stage/hiring/decision`
- [ ] Input: `{ status: 'accepted', hiringPartner: 'Name', ... }`

✅ **Verification:**
- [ ] Check candidate.status = 'documents_received' → 'sent_to_partners'
- [ ] Check stageStatuses['document-verification'] = 'accepted'
- [ ] Check stageStatuses['hiring'] = 'accepted'
- [ ] Check assignedHiringPartner = 'Partner Name'
