# Customer Management System Frontend

This directory contains the React 19 and Vite frontend for the MERN Customer Management System. It uses React Router for login, registration, dashboard, customer list, and customer detail pages, with Tailwind CSS v4 for styling.

For complete project setup, environment variables, API routes, deployment notes, and known limitations, see the [root project README](../README.md).

## Frontend commands

Run these commands from this directory:

```sh
npm install
npm run dev
npm run lint
npm run build
```

Set `VITE_API_URL` in `Frontend/.env` when the backend API is not available at the local default documented in the root README. Do not put secrets in `VITE_*` variables; they are included in browser code.
