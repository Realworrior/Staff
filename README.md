# Staff Management System

A comprehensive web application for managing staff, schedules, payroll, and more.

## Features

- **Dashboard**: Overview of staff activities and stats.
- **Schedule/Rota**: Visual calendar and rota generator for staff shifts.
- **HR Management**: Employee profiles, documents, and records.
- **Payroll**: Manage salaries, bonuses, and deductions.
- **Attendance**: Real-time clock-in/out tracking.
- **Chat/Communication**: Internal messaging system for staff.
- **Knowledge Base**: Shared documentation and training materials.
- **Leave Management**: Request and approve time off.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Backend**: Node.js, Express (located in `/server`).
- **Database**: SQLite.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd Staff
   ```

2. **Setup Frontend**:
   ```bash
   npm install
   cp .env.example .env
   ```

3. **Setup Backend**:
   ```bash
   cd server
   npm install
   cp .env.example .env
   ```

### Running the Application

1. **Start the Backend**:
   ```bash
   cd server
   npm run dev
   ```

2. **Start the Frontend**:
   ```bash
   cd ..
   npm run dev
   ```

The application will be available at `http://localhost:5173`.
