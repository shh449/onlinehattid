import express from "express";
import Stripe from "stripe";
import Order from "../Models/Order.js";
import Product from "../Models/Products.js";
import crypto from "crypto";

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ================= COMMON =================
const markOrderPaid = async (order, paymentResult = {}) => {
    if (order.isPaid) return;

    order.isPaid = true;
    order.paidAt = new Date();
    order.orderStatus = "processing";
    order.paymentStatus = "paid";

    order.paymentResult = paymentResult;

    await order.save();

    for (const item of order.orderitems) {
        await Product.findByIdAndUpdate(
            item.product,
            { $inc: { countInStock: -item.quantity } }
        );
    }
};




// ================= JAZZCASH =================
router.post("/jazzcash/initiate", async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const txnRef = `T${Date.now()}`;

        const now = new Date();

        const formatDate = (date) =>
            date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

        const txnDateTime = formatDate(now);
        const expiry = formatDate(new Date(now.getTime() + 60 * 60 * 1000));

        // IMPORTANT: JazzCash amount MUST be in paisa
        const amount = Math.round(order.totalPrice * 100);

        const data = {
            pp_Version: "1.1",
            pp_TxnType: "MWALLET",
            pp_Language: "EN",
            pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID,
            pp_Password: process.env.JAZZCASH_PASSWORD,
            pp_SubMerchantID: "",
            pp_BankID: "",
            pp_ProductID: "",
            pp_TxnRefNo: txnRef,
            pp_Amount: amount.toString(),
            pp_TxnCurrency: "PKR",
            pp_TxnDateTime: txnDateTime,
            pp_BillReference: order._id.toString(),
            pp_Description: "Order Payment",
            pp_TxnExpiryDateTime: expiry,
            pp_ReturnURL: `${process.env.BACKEND_URL}/api/payment/callback`,
        };

        // ================= CORRECT JAZZCASH HASH =================
        const sortedKeys = Object.keys(data).sort();

        let hashString = process.env.JAZZCASH_INTEGRITY_KEY + "&";

        sortedKeys.forEach((key) => {
            hashString += `${data[key]}&`;
        });

        hashString = hashString.slice(0, -1); // remove last &

        const secureHash = crypto
            .createHmac("sha256", process.env.JAZZCASH_INTEGRITY_KEY)
            .update(hashString)
            .digest("hex")
            .toUpperCase();

        data.pp_SecureHash = secureHash;

        order.paymentMethod = "JazzCash";
        order.txnRef = txnRef;
        await order.save();

        res.json({
            url: process.env.JAZZCASH_URL,
            paymentData: data,
        });

    } catch (err) {
        console.error("JazzCash Error:", err);
        res.status(500).json({ message: "JazzCash failed" });
    }
});

// ================= EASYPAISA =================
router.post("/easypaisa/initiate", async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await Order.findById(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const txnRef = `EP${Date.now()}`;

        const paymentUrl = `${process.env.EASYPAY_URL}?amount=${order.totalPrice}&ref=${txnRef}`;

        order.paymentMethod = "Easypaisa";
        order.txnRef = txnRef;
        await order.save();

        res.json({ paymentUrl });

    } catch (err) {
        console.error("Easypaisa Error:", err);
        res.status(500).json({ message: "Easypaisa failed" });
    }
});

// ================= CALLBACK =================
router.all("/callback", async (req, res) => {
    try {
        const data = req.method === "POST" ? req.body : req.query;

        console.log("JAZZCASH CALLBACK DATA:", data);

        const txnRef = data?.pp_TxnRefNo || data?.txnRef;

        if (!txnRef) {
            return res.status(400).send("Missing txnRef");
        }

        const order = await Order.findOne({ txnRef });

        if (!order) return res.status(404).send("Order not found");

        const responseCode = data?.pp_ResponseCode || "";

        const success =
            responseCode === "000" ||
            responseCode === "00" ||
            data?.status === "SUCCESS";

        if (success) {
            await markOrderPaid(order, data);
            return res.send("Payment successful");
        }

        console.log("Payment failed reason:", data?.pp_ResponseMessage);

        res.send("Payment failed");

    } catch (err) {
        console.error("Callback Error:", err);
        res.status(500).send("Server error");
    }
});

export default router;