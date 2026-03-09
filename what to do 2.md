In your workshop with Mohammed Nebab (SOC Manager), the Condition Survey emerged as a critical "Day 0" task for any new client project. It is the bridge between signing a contract and actually starting the operations.

Here is the exact requirement and process for the Survey based on the transcript:

1. The Core Objective: "Asset Ground-Truth"
Before CIT can maintain a site (Hard Services, Waste, or FM), they must know exactly what is there. The survey is a physical verification and health check of every asset at the client site.

Why it matters: If an AC unit is already broken when CIT takes over, the survey proves it wasn't CIT's fault. It also sets the "baseline" for the Maintenance Plan.

2. The Step-by-Step Workflow
Template Selection: CIT typically uses their own standard survey template. Mohammed mentioned that they rarely use client templates; instead, they send the CIT format and get the client’s approval to proceed.

Physical Inspection: Ground workers (from Ijaz’s technical team or Owais’s soft services team) walk the site.

Data Capture: For every asset, they record:

Asset Category: (AC, Pump, Lighting, etc.)

Current Condition: (Good, Fair, Poor, Non-Functional)

Attributes: (Serial numbers, brand, capacity, location)

Photo Evidence: Capturing the physical state.

Client "Intervention": Sometimes clients ask to add extra fields (e.g., "Installation Date" or "Warranty Info").

3. The "CAFM" Output (The Final Goal)
The survey data isn't just for a report; it is used to populate the Asset Registry in their management software. Mohammed specifically mentioned two systems with different requirements:

Maximo: Has strict character limits and specific hierarchy requirements.

Vasilio: Uses a different template and workflow logic.

The AI Opportunity: You mentioned creating an "App." This app should be a Smart Survey Tool that validates data on the spot to ensure it fits the character limits of Maximo/Vasilio before the worker leaves the site.

Survey Process Breakdown
Stage	Action	Ownership
Pre-Survey	Send CIT Template to Client for approval.	Haya / Mohammed
On-Site	Asset identification and condition grading.	Ijaz (Hard) / Owais (Soft)
Data Entry	Filling the "Asset Registry" sheet.	Service Owners
Integration	Formatting the sheet for Maximo or Vasilio.	Haya / Systems Dept
🚀 Where your "AI App" can act:
Based on the "Survey" requirement, the app you are building should:

Auto-Format: Convert the worker's input directly into the Maximo/Vasilio CSV format.

Condition Logic: If a worker marks an asset as "Poor," the app should require a photo and a voice-to-text description of the fault.

Asset Recognition: Use the camera to read nameplates/serial numbers to avoid manual typing errors (which Mohammed said happens often).

Would you like me to draft a "Technical Specification" for this Survey App to show Mohammed and Haya in your follow-up meeting?