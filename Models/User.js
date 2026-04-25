import mongoose from "mongoose";
import { Schema } from "mongoose";
const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    role: {
        type: String,
        default: "user"   // or "admin"
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
})
export default mongoose.model("user", UserSchema)