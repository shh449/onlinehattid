import express from "express";
import fetchuser from "../middleware/fetchuser.js";
import Cart from "../Models/Cart.js";
import Product from "../Models/Products.js";

const router = express.Router();

// Add product to cart
router.post("/addcart", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { _id, quantity, selectedImage, selectedOptions } = req.body;
        const productid = _id;

        // Fetch product to validate stock and sizePricing
        const product = await Product.findById(productid);
        if (!product) return res.status(404).json({ message: "Product not found" });

        let itemPrice = product.price;
        let itemDiscountedPrice = product.discountedPrice;

        // Handle sizePricing if size selected
        if (selectedOptions?.size && product.sizePricing && product.sizePricing.length > 0) {
            const sizeObj = product.sizePricing.find(s => s.size === selectedOptions.size);
            if (!sizeObj) return res.status(400).json({ message: `Selected size ${selectedOptions.size} not available` });
            if (sizeObj.stock < quantity) return res.status(400).json({ message: `${product.name} size ${selectedOptions.size} is out of stock` });

            itemPrice = sizeObj.price;
            itemDiscountedPrice = sizeObj.discountedPrice ?? sizeObj.price;
        } else {
            // Default stock check
            if (product.countInStock < quantity) return res.status(400).json({ message: `${product.name} is out of stock` });
        }

        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            // Create new cart
            cart = new Cart({
                user: userId,
                items: [{
                    product: productid,
                    quantity,
                    selectedImage,
                    selectedOptions,
                    price: itemPrice,
                    discountedPrice: itemDiscountedPrice
                }]
            });
        } else {
            const itemIndex = cart.items.findIndex(
                item =>
                    item.product.toString() === productid &&
                    JSON.stringify(item.selectedOptions || {}) === JSON.stringify(selectedOptions || {})
            );

            if (itemIndex > -1) {
                // Update existing item quantity
                cart.items[itemIndex].quantity += quantity;
                if (selectedImage) {
                    cart.items[itemIndex].selectedImage = selectedImage || cart.items[itemIndex].selectedImage;
                }
                if (selectedOptions) {
                    cart.items[itemIndex].selectedOptions = selectedOptions;
                }
                cart.items[itemIndex].price = itemPrice;
                cart.items[itemIndex].discountedPrice = itemDiscountedPrice;
            } else {
                // Add new item
                cart.items.push({
                    product: productid,
                    quantity,
                    selectedImage,
                    selectedOptions,
                    price: itemPrice,
                    discountedPrice: itemDiscountedPrice
                });
            }
        }

        cart.updatedAt = Date.now();
        await cart.save();

        // Populate product details
        cart = await Cart.findOne({ user: userId }).populate("items.product");

        res.status(200).json({ success: true, cart });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get user cart
router.get("/getcart", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;

        const cart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!cart) return res.status(404).json({ message: "Cart is empty" });

        res.status(200).json({ success: true, cart });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Decrease the quantity of a particular product in cart
router.put("/decreasevalue/:id", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const productid = req.params.id;
        let cart = await Cart.findOne({ user: userId });

        if (cart) {
            const itemIndex = cart.items.findIndex(
                item => item.product.toString() === productid
            );

            if (itemIndex > -1) {
                if (cart.items[itemIndex].quantity > 1) {
                    cart.items[itemIndex].quantity -= 1;
                } else {
                    // Remove item if quantity becomes 0
                    cart.items.splice(itemIndex, 1);
                }
            }

            await cart.save();
            cart = await Cart.findOne({ user: userId }).populate("items.product");
            res.status(200).json({ success: true, cart });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Remove a product from cart
router.delete("/removecart/:productId", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { productId } = req.params;

        let cart = await Cart.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        cart.updatedAt = Date.now();
        await cart.save();
        cart = await Cart.findOne({ user: userId }).populate("items.product");
        res.status(200).json({ success: true, cart });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Increase the quantity of a product in cart
router.put("/increasevalue/:id", fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const productid = req.params.id;

        let cart = await Cart.findOne({ user: userId });

        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productid
        );

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += 1;
        }

        await cart.save();

        // Populate cart items
        cart = await Cart.findOne({ user: userId }).populate("items.product");

        res.status(200).json({ success: true, cart });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;