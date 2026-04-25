import mongoose from "mongoose";
const { Schema } = mongoose;

const orderSchema = new Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true
        },

        orderitems: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "product",
                    required: true
                },
                quantity: {
                    type: Number,
                    required: true,
                    default: 1
                },

                // ✅ SNAPSHOT DATA (VERY IMPORTANT)
                name: String,
                price: Number,
                discountedPrice: Number,

                selectedImage: String,
                selectedOptions: {
                    type: Object,
                    default: {}
                }
            }
        ],

        shippingAddress: {
            address: String,
            city: String,
            postalcode: String,
            country: String,
            contact: Number
        },

        // ================= PAYMENT =================
        paymentMethod: {
            type: String,
            enum: ["COD", "Online", "JazzCash", "Easypaisa"],
            default: "COD"
        },

        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending"
        },

        isPaid: {
            type: Boolean,
            default: false
        },

        paidAt: Date,

        // ✅ TRANSACTION TRACKING
        txnRef: {
            type: String,
            unique: true,
            sparse: true
        },

        stripePaymentIntentId: String,

        // ✅ STORE FULL RESPONSE (VERY IMPORTANT)
        paymentResult: {
            id: String,
            status: String,
            update_time: String,
            email_address: String,
            raw: Object
        },

        // ================= ORDER =================
        totalPrice: {
            type: Number,
            required: true
        },

        orderStatus: {
            type: String,
            enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            default: "pending"
        },

        isDeletedByAdmin: {
            type: Boolean,
            default: false
        }

    },
    { timestamps: true }
);

export default mongoose.model("order", orderSchema);