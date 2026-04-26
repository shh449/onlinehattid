import mongoose from "mongoose";
import { Schema } from "mongoose";

const ProductSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        default: 0,
    },
    category: {
        type: String,
        required: true,
    },

    // Default price (used if no size selected)
    price: {
        type: Number,
        required: true,
    },
    discountedPrice: {
        type: Number,
        default: null,
    },

    brand: {
        type: String,
    },
    numReviews: {
        type: Number,
        default: 0,
    },
    images: {
        type: [String],
        default: [],
    },
    imagePublicIds: {
        type: [String],
        default: []
    },


    availableColors: {
        type: [String],
        default: [],
    },

    // OLD sizes (keep for compatibility)
    availableSizes: {
        type: [String],
        default: [],
    },

    // ✅ NEW: Size-based pricing system
    sizePricing: [
        {
            size: {
                type: String,
            },
            price: {
                type: Number,
            },
            discountedPrice: {
                type: Number,
                default: null,
            },
            stock: {
                type: Number,
                default: 0,
            },

        }
    ],



    reviews: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
            name: String,
            rating: Number,
            comment: String,
        }
    ],

    countInStock: {
        type: Number,
        required: true,
        default: 0,
    },

}, { timestamps: true });

export default mongoose.model("product", ProductSchema);