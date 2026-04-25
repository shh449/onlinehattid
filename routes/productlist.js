import express from "express";
import Products from "../Models/Products.js";
import fetchuser from "../middleware/fetchuser.js";
import admin from "../middleware/admin.js";
import { body, validationResult } from "express-validator";

const router = express.Router();

// Add new product (admin only)
router.post("/addproducts", fetchuser, admin, [
    body("name").isString().withMessage("name must be string"),
    body("description").isString().withMessage("description must be string"),
    body("countInStock").isNumeric().withMessage("countInStock must be number"),
    body("category").isString().withMessage("category must be string"),
    body("rating").isNumeric().withMessage("rating must be number"),
    body("price").isNumeric().withMessage("price must be number"),
    body("discountedPrice").optional().isNumeric().withMessage("discountedPrice must be number"),
    body("images").isArray().withMessage("images must be array"),
    body("availableColors").isArray().withMessage("availableColors must be array"),
    body("availableSizes").isArray().withMessage("availableSizes must be array"),
    body("deliveryCharge").optional().isNumeric().withMessage("deliveryCharge must be number")
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const {
            name,
            description,
            countInStock,
            category,
            rating,
            price,
            discountedPrice,
            images,
            imagePublicIds,
            imageSrc,
            imageAlt,
            availableColors,
            availableSizes,
            brand,
            deliveryCharge,
            sizePricing
        } = req.body;

        let product = new Products({
            user: req.user.id,
            name,
            description,
            price,
            discountedPrice: discountedPrice || null,
            countInStock,
            category,
            rating,
            images,
            imageSrc,
            imageAlt,
            availableColors,
            availableSizes,
            sizePricing: sizePricing || [],
            deliveryCharge: deliveryCharge || 5, // default delivery charge
            brand
        });

        const newProduct = await product.save();
        res.status(201).json(newProduct);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// Get all products
// Get all products (WITH PAGINATION + INFINITE SCROLL SUPPORT)
router.get("/getallproducts", async (req, res) => {
    try {
        // ✅ GET QUERY PARAMS
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;

        // ✅ CALCULATE SKIP
        const skip = (page - 1) * limit;

        // ✅ FETCH PRODUCTS WITH PAGINATION
        const products = await Products.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // ✅ TOTAL COUNT (IMPORTANT)
        const totalProducts = await Products.countDocuments();

        // ✅ CHECK IF MORE DATA EXISTS
        const hasMore = skip + products.length < totalProducts;

        // ✅ RESPONSE FORMAT (IMPORTANT FOR FRONTEND)
        res.json({
            products,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts,
            hasMore
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal error" });
    }
});

// Get one product by ID
router.get("/fetchoneproduct/:id", async (req, res) => {
    try {
        const product = await Products.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json(product);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal error" });
    }
});

// Delete product (admin only)
router.delete("/deleteproduct/:id", fetchuser, admin, async (req, res) => {
    try {
        const product = await Products.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product deleted" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal error" });
    }
});
//admin routes for products...
// Get all products (NO pagination for admin)
router.get("/adminproducts", fetchuser, admin, async (req, res) => {
    try {
        const products = await Products.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Internal error" });
    }
});

// Update product (admin only)
router.put("/updateproduct/:id", fetchuser, admin, async (req, res) => {
    try {
        const {
            name,
            description,
            countInStock,
            category,
            rating,
            price,
            discountedPrice,
            images,
            imageSrc,
            imageAlt,
            availableColors,
            availableSizes,
            brand,
            deliveryCharge,
            sizePricing
        } = req.body;

        const updatedFields = {
            name,
            description,
            countInStock,
            category,
            rating,
            price,
            discountedPrice: discountedPrice || null,
            images,
            imageSrc,
            imageAlt,
            availableColors,
            availableSizes,
            sizePricing: sizePricing || [],
            deliveryCharge: deliveryCharge,
            brand
        };

        // Remove undefined fields
        Object.keys(updatedFields).forEach(
            key => updatedFields[key] === undefined && delete updatedFields[key]
        );

        const product = await Products.findByIdAndUpdate(
            req.params.id,
            updatedFields,
            { new: true, runValidators: true }
        );

        if (!product) return res.status(404).json({ message: "Product not found" });

        res.status(200).json({ success: true, product });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal error" });
    }
});

// Add review to product
router.post("/review/:id", fetchuser, async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const product = await Products.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const review = {
            user: req.user.id,
            name: req.user.name,
            rating: Number(rating),
            comment
        };

        product.reviews.push(review);
        product.numReviews = product.reviews.length;
        product.rating = product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;

        await product.save();
        res.status(201).json({ message: "Review added" });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;