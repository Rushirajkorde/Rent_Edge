
const mongoose = require('mongoose');

// --- USER SCHEMA ---
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true }, // We keep email required for notifications
  phone: { type: String }, // Optional but unique if present
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['OWNER', 'PAYER'], required: true },
  linkedProperty: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' } // For Payers
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { delete ret._id; delete ret.passwordHash; } }
});

// --- PROPERTY SCHEMA ---
const propertySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  rentAmount: { type: Number, required: true },
  securityDeposit: { type: Number, required: true },
  rentPaymentDate: { type: String, required: true }, // ISO Date YYYY-MM-DD
  ownerUpiId: { type: String, required: true },
  propertyCode: { type: String, required: true, unique: true, uppercase: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { delete ret._id; } }
});

// --- TENANT RECORD SCHEMA ---
const fineRecordSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amountDeducted: Number,
  daysLate: Number,
  rentMonth: String
});

const transactionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amountPaid: Number,
  fineDeducted: Number,
  rentMonth: String,
  transactionRef: String
});

const tenantRecordSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  currentDeposit: { type: Number, required: true },
  lastPaymentDate: { type: Date, default: Date.now },
  moveInDate: { type: Date, default: Date.now },
  fineHistory: [fineRecordSchema],
  paymentHistory: [transactionSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { delete ret._id; } }
});

// --- MAINTENANCE SCHEMA ---
const maintenanceSchema = new mongoose.Schema({
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantName: String,
  title: String,
  description: String,
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
  aiEnhanced: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true, versionKey: false, transform: (doc, ret) => { delete ret._id; } }
});

module.exports = {
  User: mongoose.model('User', userSchema),
  Property: mongoose.model('Property', propertySchema),
  TenantRecord: mongoose.model('TenantRecord', tenantRecordSchema),
  MaintenanceRequest: mongoose.model('MaintenanceRequest', maintenanceSchema)
};
