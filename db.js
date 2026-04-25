import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connecttomongo = async () => {
    const mongouri = process.env.MONGO_URI;

    if (!mongouri) {
        throw new Error("MONGO_URI is missing in environment variables");
    }

    try {
        await mongoose.connect(mongouri);
        console.log("connected to mongoes");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

export default connecttomongo;