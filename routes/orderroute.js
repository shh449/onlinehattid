import express from "express";
import fetchuser from "../middleware/fetchuser.js";
import Cart from "../Models/Cart.js";
import Order from "../Models/Order.js";
import admin from "../middleware/admin.js";
import Product from "../Models/Products.js";

const router = express.Router();

// User placing order from cart ...
router.post("/placeorder", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            productId,
            quantity,
            shippingAddress,
            paymentMethod,
            items,
            selectedImage,
            selectedOptions
        } = req.body;

        // ✅ VALIDATE PAYMENT METHOD
        const validMethods = ["COD", "Online", "JazzCash", "Easypaisa"];
        if (!validMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: "Invalid payment method" });
        }

        // ✅ VALIDATE ADDRESS
        if (
            !shippingAddress ||
            !shippingAddress.address ||
            !shippingAddress.city ||
            !shippingAddress.postalcode ||
            !shippingAddress.country ||
            !shippingAddress.contact
        ) {
            return res.status(400).json({ message: "Complete shipping address required" });

        }

        let orderItems = [];

        // ================= SINGLE PRODUCT =================
        if (productId) {
            const product = await Product.findById(productId);
            if (!product) return res.status(404).json({ message: "Product not found" });

            const qty = quantity || 1;

            if (product.countInStock < qty) {
                return res.status(400).json({ message: `${product.name} out of stock` });
            }

            orderItems.push({
                product: product._id,
                quantity: qty,
                selectedImage: selectedImage || product.images?.[0] || "",
                selectedOptions: selectedOptions || {},
                price: product.price,
                discountedPrice: product.discountedPrice
            });
        }

        // ================= CART =================
        else if (items && items.length > 0) {
            for (let item of items) {
                const prod = await Product.findById(item.product._id || item.product);
                if (!prod) continue;

                const qty = item.quantity || 1;

                if (prod.countInStock < qty) {
                    return res.status(400).json({ message: `${prod.name} out of stock` });
                }

                orderItems.push({
                    product: prod._id,
                    quantity: qty,
                    selectedImage: item.selectedImage || prod.images?.[0] || "",
                    selectedOptions: item.selectedOptions || {},
                    price: prod.price,
                    discountedPrice: prod.discountedPrice
                });
            }

            if (orderItems.length === 0) {
                return res.status(400).json({ message: "No valid items" });
            }

            // clear cart
            await Cart.findOneAndUpdate(
                { user: userId },
                { $set: { items: [] } }
            );
        }

        else {
            return res.status(400).json({ message: "No products selected" });
        }

        // ================= TOTAL =================
        let totalPrice = orderItems.reduce((acc, item) => {
            return acc + (item.discountedPrice ?? item.price) * item.quantity;
        }, 0);

        // ================= CREATE ORDER =================
        const order = await Order.create({
            user: userId,
            orderitems: orderItems,
            shippingAddress,
            paymentMethod,
            totalPrice,

            // 🔥 IMPORTANT
            orderStatus: paymentMethod === "COD" ? "processing" : "pending",
            isPaid: paymentMethod === "COD" ? true : false,
            paidAt: paymentMethod === "COD" ? Date.now() : null
        });

        // ================= STOCK REDUCTION =================
        // ✅ ONLY reduce stock for COD
        if (paymentMethod === "COD") {
            for (let item of orderItems) {
                await Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { countInStock: -item.quantity } }
                );
            }
        }

        res.status(201).json({
            message: "Order created",
            orderId: order._id
        });

    } catch (error) {
        console.error("Order error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Deleting an order
router.delete("/delete/:id", fetchuser, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // Only allow deletion if the user owns the order
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Optional: prevent deletion if delivered
        if (order.orderStatus === "delivered") {
            return res.status(400).json({ message: "Delivered orders cannot be deleted" });
        }

        await order.deleteOne();
        res.status(200).json({ message: "Order deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Getting a single product order
router.get("/oneorder/:id", fetchuser, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate("orderitems.product");
        if (!order) return res.status(404).json({ message: "Order not found" });
        res.status(201).json(order);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// User order history
router.get("/myorders", fetchuser, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .populate("orderitems.product")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Admin getting all orders
router.get("/adminorder", fetchuser, admin, async (req, res) => {
    try {
        const order = await Order.find()
            .populate("user", "name email")
            .populate("orderitems.product")
            .sort({ createdAt: -1 });
        if (!order) return res.status(404).json({ message: "No orders" });
        res.status(201).json(order);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Updating order status (admin)
router.put("/status/:id", fetchuser, admin, async (req, res) => {
    try {
        const { status, ispaid } = req.body;
        const orderid = req.params.id;
        const order = await Order.findById(orderid);
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.orderStatus = status || order.orderStatus;
        order.isPaid = ispaid ?? order.isPaid;
        if (ispaid) {
            order.paidAt = Date.now();
        }

        await order.save();
        res.status(201).json({ message: "Success", order });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;