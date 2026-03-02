const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const Job = require('../models/Job');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_SMKlwIoFxLLDbm',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'qkl2NX0NUHpkA4t5Xekv4mjI',
});

// Create an order
router.post('/create-order', auth, async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;

        const options = {
            amount: amount * 100, // amount in smallest currency unit (paise for INR)
            currency,
            receipt,
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('Razorpay Order Selection Error:', error);
        res.status(500).json({ message: 'Error creating Razorpay order' });
    }
});

// Verify payment
router.post('/verify-payment', auth, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, projectId } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'qkl2NX0NUHpkA4t5Xekv4mjI')
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Payment verified
            if (projectId) {
                const project = await Project.findById(projectId).populate('jobId');
                if (project) {
                    project.paymentStatus = 'paid';
                    project.completionStatus = 'completed';
                    await project.save();

                    // Update job status if not already
                    await Job.findByIdAndUpdate(project.jobId._id, { status: 'completed' });
                }
            }
            return res.status(200).json({ message: "Payment verified successfully" });
        } else {
            return res.status(400).json({ message: "Invalid signature sent!" });
        }
    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({ message: "Internal Server Error!" });
    }
});

module.exports = router;
