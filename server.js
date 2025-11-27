
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const { User, Property, TenantRecord, MaintenanceRequest } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentedge';
const SECRET_KEY = process.env.JWT_SECRET || 'rentedge-mern-secret';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- CORE BUSINESS LOGIC: FINE CALCULATION ---
const calculateFine = (paymentDateStr, lastPaymentDate) => {
    const today = new Date();
    today.setHours(0,0,0,0);

    const [y, m, d] = paymentDateStr.split('-').map(Number);
    const paymentDate = new Date(y, m - 1, d);
    paymentDate.setHours(0,0,0,0);

    const lastPay = new Date(lastPaymentDate);
    lastPay.setHours(0,0,0,0);

    // If already paid for this cycle (assuming monthly logic for demo simplicity, 
    // ideally check if lastPay was in current month)
    // For this specific logic: if last payment was ON or AFTER the due date cycle start
    if (lastPay >= paymentDate) return { fine: 0, daysLate: 0, dayOfCycle: 0 };
    
    // If today is before payment date
    if (today <= paymentDate) return { fine: 0, daysLate: 0, dayOfCycle: 1 };

    // Calculate Lateness
    const diffTime = today.getTime() - paymentDate.getTime();
    const daysDiff = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const dayOfCycle = daysDiff + 1;

    // Day 1 (Due Date) = 0 fine
    // Day 2 (1 day late) = 100
    // Day 3 (2 days late) = 200
    if (daysDiff < 1) return { fine: 0, daysLate: 0, dayOfCycle: 1 };

    const power = daysDiff - 1;
    const fine = 100 * Math.pow(2, power);
    return { fine, daysLate: daysDiff, dayOfCycle };
};

// --- ROUTES ---

// 1. Auth: Sign Up
app.post('/api/auth/signup', async (req, res) => {
    const { name, email, phone, role } = req.body;
    try {
        // Check if user exists
        const existing = await User.findOne({ $or: [{ email }, { phone }] });
        if (existing) {
            return res.status(400).json({ error: "User with this email or phone already exists." });
        }

        const passwordHash = await bcrypt.hash('password123', 10); // Default password for MVP
        const user = new User({
            name,
            email,
            phone,
            role,
            passwordHash
        });
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Auth: Login (Email or Phone)
app.post('/api/auth/login', async (req, res) => {
    const { identifier, role } = req.body; // identifier = email OR phone
    try {
        // Search by Email OR Phone
        let user = await User.findOne({ 
            $or: [{ email: identifier }, { phone: identifier }],
            role: role
        });
        
        if (!user) {
            return res.status(404).json({ error: "User not found. Please sign up." });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Owner: Create Property
app.post('/api/properties', async (req, res) => {
    const { ownerId, name, address, rentAmount, securityDeposit, rentPaymentDate, ownerUpiId } = req.body;
    try {
        const propertyCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const property = new Property({
            owner: ownerId,
            name, address, rentAmount, securityDeposit, rentPaymentDate, ownerUpiId, propertyCode
        });
        await property.save();
        res.json(property);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Owner: Dashboard Data
app.get('/api/owner/dashboard/:ownerId', async (req, res) => {
    try {
        const properties = await Property.find({ owner: req.params.ownerId });
        
        // Get all tenants linked to these properties
        const propIds = properties.map(p => p._id);
        const tenantRecords = await TenantRecord.find({ property: { $in: propIds } })
            .populate('user', 'name email phone')
            .populate('property', 'securityDeposit'); // to compare with current

        // Format for frontend
        const tenants = tenantRecords.map(tr => ({
            user: tr.user,
            record: tr
        }));

        const requests = await MaintenanceRequest.find({ property: { $in: propIds } }).sort({ createdAt: -1 });

        res.json({ properties, tenants, requests });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Owner: Remove Tenant
app.delete('/api/owner/tenant/:id', async (req, res) => {
    try {
        const record = await TenantRecord.findById(req.params.id);
        if (!record) return res.status(404).json({ error: "Tenant record not found" });

        // Unlink the user
        await User.findByIdAndUpdate(record.user, { linkedProperty: null });
        
        // Delete the record
        await TenantRecord.findByIdAndDelete(req.params.id);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Payer: Connect Property
app.post('/api/payer/connect', async (req, res) => {
    const { userId, code } = req.body;
    try {
        const prop = await Property.findOne({ propertyCode: code });
        if (!prop) return res.status(404).json({ error: "Invalid Property Code" });

        const user = await User.findById(userId);
        user.linkedProperty = prop._id;
        await user.save();

        // Initialize Tenant Record
        let record = await TenantRecord.findOne({ user: userId, property: prop._id });
        if (!record) {
            // Set lastPaymentDate to 30 days ago to trigger immediate checks
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            record = new TenantRecord({
                user: userId,
                property: prop._id,
                currentDeposit: prop.securityDeposit,
                lastPaymentDate: thirtyDaysAgo,
                moveInDate: new Date()
            });
            await record.save();
        }

        res.json({ success: true, property: prop });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 7. Payer: Dashboard Data
app.get('/api/payer/dashboard/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('linkedProperty');
        if (!user || !user.linkedProperty) return res.json({ linked: false });

        const prop = user.linkedProperty;
        const record = await TenantRecord.findOne({ user: user._id });

        // Calculate Real-Time Fine
        const fineData = calculateFine(prop.rentPaymentDate, record.lastPaymentDate);

        // Sort history by date desc
        if (record.paymentHistory) {
            record.paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        res.json({
            linked: true,
            property: prop,
            record: {
                ...record.toJSON(),
                ...fineData // Inject fine data
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. Payer: Process Payment
app.post('/api/payer/pay', async (req, res) => {
    const { userId } = req.body;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(userId).populate('linkedProperty');
        const record = await TenantRecord.findOne({ user: userId });
        const prop = user.linkedProperty;

        const { fine, daysLate } = calculateFine(prop.rentPaymentDate, record.lastPaymentDate);

        // Deduct Fine
        record.currentDeposit -= fine;
        record.lastPaymentDate = new Date();

        const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

        // Log Fine
        if (fine > 0) {
            record.fineHistory.push({
                amountDeducted: fine,
                daysLate: daysLate,
                rentMonth: monthName
            });
        }

        // Log Transaction
        const ref = 'UPI' + Math.floor(100000 + Math.random() * 900000);
        record.paymentHistory.unshift({
            amountPaid: prop.rentAmount,
            fineDeducted: fine,
            rentMonth: monthName,
            transactionRef: ref
        });

        await record.save({ session });
        await session.commitTransaction();

        res.json({ success: true, newDeposit: record.currentDeposit, finePaid: fine });
    } catch (err) {
        await session.abortTransaction();
        res.status(500).json({ error: err.message });
    } finally {
        session.endSession();
    }
});

// 9. Maintenance Request
app.post('/api/maintenance', async (req, res) => {
    try {
        const reqData = new MaintenanceRequest(req.body); 
        const newReq = new MaintenanceRequest({
            property: req.body.propertyId,
            tenant: req.body.tenantId,
            tenantName: req.body.tenantName,
            title: req.body.title,
            description: req.body.description,
            aiEnhanced: req.body.aiEnhanced
        });
        await newReq.save();
        res.json(newReq);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`RentEdge MERN Backend running on port ${PORT}`);
});
