Neural Atlas Lab

Create a clean, responsive, high-performance web application built completely in Python using Streamlit for an advanced neuroscience research and diagnostic platform named "Cerebruim".

🛠️ TECH STACK & ARCHITECTURE CONSTRAINTS

Language & Framework: 100% Python using Streamlit multi-page modular architecture.

Database: SQLite backend ("database.py") for managing Users, Roles, Gift Codes, and Scan Usage.

Modularity: Build isolated, independently testable Python modules inside a "modules/" package so each tool functions autonomously.

Responsive Layout: Dark-mode UI with a futuristic purple/violet scientific theme, sidebar navigation, custom CSS containers, and desktop/mobile fluid responsiveness.

🏛️ PROJECT STRUCTURE

Set up the application with this explicit file structure:

cerebruim/
│
├── app.py                 # Main Streamlit execution script, session state & routing
├── database.py            # SQLite engine for auth, roles, gift codes & usage tracking
│
├── modules/
│   ├── __init__.py
│   ├── ingestion.py        # Module 1: File ingestion (.edf, .csv, .pdf)
│   ├── diagnostics.py      # Module 2: Multi-disease diagnostic models
│   ├── brain_mapping.py    # Module 3: Functional neural decoding hub
│   ├── live_stream.py      # Module 4: Simulated real-time EEG stream & alerts
│   ├── mel_assistant.py    # Module 5: MEL AI research assistant & citations
│   └── admin_panel.py      # Module 6: Creator & Admin dashboard
│
└── requirements.txt

🔑 USER ROLES, AUTHENTICATION & ACCESS CONTROL

Guest Users (No Sign-In Required):

- Immediate access to free diagnostic tools without logging in.
- Restricted to a maximum of 2 total file uploads/scans (stored via local browser/session state).

Registered Users:

- Optional email and password login/signup.
- Saves scan history, literature research notes, and diagnostic logs.

Admin Role:

- Access to system analytics, usage tracking, and the dynamic Gift Code manager in the UI.
- Restriction: Admins cannot add or remove other Admins.

Creator Role (Super Admin):

- Designated master email login.
- Complete platform control: create/delete admins, modify all settings, dynamic gift code generation, and bypass all scan limits.

🎟️ DYNAMIC GIFT CODE SYSTEM

Implement an in-app Admin input box to create, edit, deactivate, or delete VIP access codes (e.g., "JUDGE2026", "ADMISSIONVIP").

- Codes update directly in the SQLite database without editing Python source code.
- Users can enter these gift codes in the app sidebar to instantly unlock full Pro Tier access.

📱 MODULE & TOOL BREAKDOWN

1. Sidebar & Navigation ("app.py")

- Dark header with logo placeholder and current user status badge (Guest / Registered / Pro / Admin / Creator).
- Free upload counter display (Uploads Used: X/2).

Navigation menu:

- 🏠 Dashboard & Data Ingestion
- 🔬 Diagnostic Engine
- 🧠 Brain Mapping
- ⚡ Live EEG Stream (Pro)
- 🤖 MEL Research Assistant
- ⚙️ Creator & Admin Panel (Restricted)

Include a Redeem Gift Code box and PayPal Pro Upgrade callout.

2. Module 1: Data Ingestion Hub ("modules/ingestion.py")

- Supports ".edf"/".edf+" signal files, ".csv"/".txt" data matrices, and ".pdf" medical reports.
- Enforces the 2-scan limit for free users.
- Displays file metadata, sample matrix tables (using AG Grid styling), and signal properties.

3. Module 2: Multi-Disease Diagnostic Engine ("modules/diagnostics.py")

Epilepsy Module: Seizure detection, spike prediction, and abnormal discharge analysis.

Alzheimer's Disease Module: Spectral frequency shifts and cognitive degradation metrics.

Glioblastoma Module: MRI feature scanning and tumour risk classification.

Displays model metrics: Precision, Recall, F1-Score, and ROC-AUC.

4. Module 3: Functional Neural Decoding Hub ("modules/brain_mapping.py")

- Interactive cortical mapping for Occipital, Temporal, Frontal, and Parietal lobes.
- Displays active sensory/cognitive pathways, including visual processing, auditory response, and decision-making.

5. Module 4: Live EEG Stream Simulator ("modules/live_stream.py") — Pro Tool

- Animated real-time EEG signal plotting using Plotly/Matplotlib.
- Real-time hazard detection badges and high-risk event alerts.

6. Module 5: MEL (Medical & Engineering Lab Assistant) ("modules/mel_assistant.py")

- AI research assistant tab.
- Form to search biomedical papers, summarise complex literature, and output formatted APA/IEEE citations.

7. Module 6: Creator & Admin Panel ("modules/admin_panel.py")

Creator Tab: Input box to assign new Admin privileges by email or revoke existing ones.

Gift Code Manager: Create, view, update, and delete active VIP promotional codes.

System Metrics: Total users, active codes, and global scan counts.

👩🏽‍💻 PROJECT OWNERSHIP

Creator & Developer: Abigail James

🌐 LIVE DEPLOYMENT

Platform: Cloudflare

**Live application:** [Cerebruim](https://cerebruim-neural-atlas-lab.pages.dev)

💻 DEVELOPMENT

Prefer working locally? Install Python and pip, then clone the repository.

git clone <this-repository-url>
cd <repository-name>
pip install -r requirements.txt
streamlit run app.py
