import mongoose from "mongoose";

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "product",
                required: true
            },

            quantity: {
                type: Number,
                default: 1,

            },
            selectedOptions: {
                type: Object,
                default: {}
            },
            selectedImage: {
                type: String,
                default: ""
            },

        }
    ],

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("cart", cartSchema);