import express from "express";
import fetchuser from "../middleware/fetchuser.js";
import admin from "../middleware/admin.js";
import User from "../Models/User.js";
import Order from "../Models/Order.js";
import Product from "../Models/Products.js";


const router = express.Router();

// Get all users (admin only)
router.get("/users", fetchuser, admin, async (req, res) => {
    try {
        const users = await User.find().select("-password"); // exclude passwords
        res.status(200).json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Delete a user (admin only)
router.delete("/users/:id", fetchuser, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.remove();
        res.status(200).json({ message: "User deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
router.get("/stats", fetchuser, admin, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalOrders = await Order.countDocuments();

        const paidOrders = await Order.find({ isPaid: true });
        const totalRevenue = paidOrders.reduce((acc, order) => acc + order.totalPrice, 0);

        res.status(200).json({
            totalUsers,
            totalProducts,
            totalOrders,
            totalRevenue,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;