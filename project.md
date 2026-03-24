Project Structure
cleaning-saas/
│
├── client/                # React (Next.js recommended)
├── server/                # Node backend
├── shared/                # shared types / constants
├── docker-compose.yml
└── README.md

Backend (Node + Express)
/server/src
src/
├── app.js
├── config/
│   ├── db.js
│   └── i18n.js
├── middleware/
│   ├── auth.js
│   ├── tenant.js
│   └── error.js
├── models/
│   ├── Tenant.js
│   ├── User.js
│   ├── Customer.js
│   ├── Job.js
│   └── Invoice.js
├── routes/
│   ├── auth.routes.js
│   ├── customer.routes.js
│   ├── job.routes.js
│   └── tenant.routes.js
├── controllers/
├── services/
│   ├── ai.service.js
│   ├── notification.service.js
│   └── billing.service.js
└── utils/

Multi-Tenant Middleware
// middleware/tenant.js
module.exports = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  req.tenantId = tenantId;
  next();
};
Example Model (Customer)
// models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  name: String,
  phone: String,
  address: String,
  preferredLanguage: {
    type: String,
    enum: ['en', 'es'],
    default: 'en'
  },
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);

Job Model
const JobSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  scheduledAt: Date,
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed'],
    default: 'scheduled'
  },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

Route Example
// routes/customer.routes.js
const router = require('express').Router();
const Customer = require('../models/Customer');

router.post('/', async (req, res) => {
  const customer = await Customer.create({
    ...req.body,
    tenantId: req.tenantId
  });

  res.json(customer);
});

router.get('/', async (req, res) => {
  const customers = await Customer.find({ tenantId: req.tenantId });
  res.json(customers);
});

module.exports = router;

Frontend (React / Next.js)

/client
src/
├── pages/
│   ├── dashboard.js
│   ├── customers.js
│   ├── jobs.js
├── components/
│   ├── Layout.js
│   ├── Sidebar.js
│   ├── JobCard.js
├── hooks/
├── services/
│   └── api.js
├── i18n/
│   ├── en.json
│   └── es.json

i18n Setup (react-i18next)
// i18n/en.json
{
  "dashboard": "Dashboard",
  "customers": "Customers",
  "jobs": "Jobs"
}

// i18n/es.json
{
  "dashboard": "Panel",
  "customers": "Clientes",
  "jobs": "Trabajos"
}

API Service
// services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
});

api.interceptors.request.use((config) => {
  config.headers['x-tenant-id'] = localStorage.getItem('tenantId');
  return config;
});

export default api;

Simple Dashboard Page
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Upcoming jobs, revenue, activity...</p>
    </div>
  );
}

AI Service (basic)
// services/ai.service.js
const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function autoReply(message) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: message }]
  });

  return response.choices[0].message.content;
}

module.exports = { autoReply };

Docker (optional)
version: '3'
services:
  mongo:
    image: mongo
    ports:
      - "27017:27017"

  server:
    build: ./server
    ports:
      - "5000:5000"
    depends_on:
      - mongo


MVP PRIORITY (what to build first)
Auth + Tenant system

Customers (CRUD)

Jobs + scheduling

Basic dashboard

SMS/email (later AI)