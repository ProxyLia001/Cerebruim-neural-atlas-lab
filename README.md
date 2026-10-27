# Neural Atlas Lab

Create a clean, responsive, high-performance web application built completely in Python using Streamlit for an advanced neuroscience research and diagnostic platform named "Neura" (formerly Cerebrium).



### 🛠️ TECH STACK & ARCHITECTURE CONSTRAINTS

- **Language & Framework:** 100% Python using Streamlit multi-page modular architecture.

- **Database:** SQLite backend (`database.py`) for managing Users, Roles, Gift Codes, and Scan Usage.

- **Modularity:** Build isolated, independently testable Python modules inside a `modules/` package so each tool functions autonomously.

- **Responsive Layout:** Dark-mode UI with a futuristic purple/violet scientific theme, sidebar navigation, custom CSS containers, and desktop/mobile fluid responsiveness.



---



### 🏛️ PROJECT STRUCTURE

Set up the application using this explicit file structure:



neura/

│

├── app.py                      # Main Streamlit execution script, session state & routing

├── database.py                 # SQLite engine for auth, roles, gift codes & usage tracking

│

├── modules/

│   ├── __init__.py

│   ├── ingestion.py            # Module 1: File ingestion (.edf, .csv, .pdf)

│   ├── diagnostics.py          # Module 2: Multi-disease diagnostic models

│   ├── brain_mapping.py        # Module 3: Functional neural decoding hub

│   ├── live_stream.py          # Module 4: Simulated real-time EEG stream & alerts

│   ├── mel_assistant.py        # Module 5: MEL AI research assistant & citations

│   └── admin_panel.py          # Module 6: Creator & Admin dashboard

│

└── requirements.txt



---



### 🔑 USER ROLES, AUTHENTICATION & ACCESS CONTROL

1. **Guest Users (No Sign-In Required):**

   - Immediate access to free diagnostic tools without logging in.

   - Restricted to a maximum of **2 total file uploads/scans** (stored via local browser/session state).

2. **Registered Users:**

   - Optional email and password login/signup.

   - Saves scan history, literature research notes, and diagnostic logs.

3. **Admin Role:**

   - Access to system analytics, usage tracking, and the dynamic Gift Code manager in the UI.

   - *Restriction:* Admins **cannot** add or remove other Admins.

4. **Creator Role (Super Admin / You):**

   - Designated master email login.

   - Complete platform control: create/delete admins, modify all settings, dynamic gift code generation, and bypass all scan limits.



---



### 🎟️ DYNAMIC GIFT CODE SYSTEM

- Implement an in-app Admin input box to create, edit, deactivate, or delete VIP access codes (e.g., `JUDGE2026`, `ADMISSIONVIP`).

- Codes update directly in the SQLite database without editing Python source code.

- Users can enter these gift codes in the app sidebar to instantly unlock full Pro Tier access.



---



### 📱 MODULE & TOOL BREAKDOWN



#### 1. Sidebar & Navigation (`app.py`)

- Dark header with logo placeholder and current user status badge (Guest / Registered / Pro / Admin / Creator).

- Free upload counter display (`Uploads Used: X/2`).

- Navigation menu:

  - 🏠 Dashboard & Data Ingestion

  - 🔬 Diagnostic Engine

  - 🧠 Brain Mapping

  - ⚡ Live EEG Stream (Pro)

  - 🤖 MEL Research Assistant

  - ⚙️ Creator & Admin Panel (Restricted)

- Redeem Gift Code box & PayPal Pro Upgrade callout.



#### 2. Module 1: Data Ingestion Hub (`modules/ingestion.py`)

- Supports `.edf`/`.edf+` signal files, `.csv`/`.txt` data matrices, and `.pdf` medical reports.

- Enforces the **2-scan limit** for free users.

- Displays file metadata, sample matrix tables (using AG Grid styling), and signal properties.



#### 3. Module 2: Multi-Disease Diagnostic Engine (`modules/diagnostics.py`)

- **Epilepsy Module:** Seizure detection, spike prediction, and abnormal discharge analysis.

- **Alzheimer's Disease Module:** Spectral frequency shifts and cognitive degradation metrics.

- **Glioblastoma Module:** MRI feature scanning and tumor risk classification.

- Displays model metrics: Precision, Recall, F1-Score, and ROC-AUC.



#### 4. Module 3: Functional Neural Decoding Hub (`modules/brain_mapping.py`)

- Interactive cortical mapping for Occipital, Temporal, Frontal, and Parietal lobes.

- Displays active sensory/cognitive pathways (visual processing, auditory response, decision-making).



#### 5. Module 4: Live EEG Stream Simulator (`modules/live_stream.py`) - *Pro Tool*

- Animated real-time EEG signal plotting using Plotly/Matplotlib.

- Real-time hazard detection badges and high-risk event alerts.



#### 6. Module 5: MEL (Medical & Engineering Lab Assistant) (`modules/mel_assistant.py`)

- AI research assistant tab.

- Form to search biomedical papers, summarize complex literature, and output formatted APA/IEEE citations.



#### 7. Module 6: Creator & Admin Panel (`modules/admin_panel.py`)

- **Creator Tab:** Input box to assign new Admin privileges by email or revoke existing ones.

- **Gift Code Manager:** Create, view, update, and delete act

ive VIP promo codes.

- **System Metrics:** Total users, active codes, and global scan counts.



The name of the app is cerebruim

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://neural-atlas-lab.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c921a817-dc1f-4686-baa4-2ed6b8f51978).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
