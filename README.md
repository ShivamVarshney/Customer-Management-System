# CustomerHub — Customer Management System

CustomerHub is a full-stack Customer Relationship Management (CRM) application built using the MERN stack. It helps users manage customer information, track customer status and lead stages, view dashboard analytics, and organize customer data through workspaces.

## Features

- **User Authentication:** Secure registration and login.
- **Customer Management:** Create, view, update, and delete customer records.
- **Dashboard:** View total, active, pending, and inactive customers, along with recent customer activity.
- **Analytics:** Analyze customer data using date ranges and monthly summaries.
- **Search and Filters:** Search customers by name, company, email, or phone number and filter by status or lead stage.
- **Lead Management:** Track lead stages separately from customer account status.
- **Workspace Management:** Create and switch between workspaces with workspace-specific customer data.
- **International Phone Input:** Select country codes when entering phone numbers.
- **Data Export:** Export customer data in CSV, Excel, and PDF formats, with options for selected records and columns.
- **Theme Customization:** Choose light, dark, or system appearance and customize the accent color.
- **Responsive UI:** Designed to work across desktop and mobile screen sizes.

## Tech Stack

**Frontend**
- React
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)

**Tools and Libraries**
- Git and GitHub
- npm
- REST APIs

## Project Structure

```text
Assignment/
├── Backend/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Models/
│   ├── Routes/
│   ├── Services/
│   ├── test/
│   ├── package.json
│   └── server.js
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB database
- Git

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Assignment
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with your actual GitHub repository URL.

### 2. Configure Environment Variables

Create the required `.env` files using the provided `.env.example` templates in the backend and frontend folders.

Add your own database connection string, authentication secret, and other required configuration values according to the application's code.

**Important:** Never commit actual `.env` files, database credentials, or authentication secrets to GitHub.

### 3. Install Backend Dependencies

```bash
cd Backend
npm install
```

Start the backend using the script configured in `Backend/package.json`.

### 4. Install Frontend Dependencies

Open a separate terminal:

```bash
cd Frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## API Overview

The backend provides REST API endpoints for:

- Authentication
- Customer management
- Dashboard summaries
- Analytics
- Workspace management

Refer to the backend routes for the exact endpoint paths and supported HTTP methods.

## Security and Data Isolation

- Protected routes require authentication.
- Customer data is scoped to the authorized user and workspace.
- Environment variables are used for sensitive configuration.
- Backend validation and authorization help prevent unauthorized access to customer records.

## Future Improvements

- Automated deployment and CI/CD.
- Additional analytics and reporting.
- Email notifications through an email service provider.
- Expanded automated integration and end-to-end testing.

## Author

**Shivam Varshney**

GitHub: [ShivamVarshney](https://github.com/ShivamVarshney)

---

This project was developed to demonstrate full-stack web development skills, REST API integration, authentication, database management, responsive UI design, and workspace-based data organization.
