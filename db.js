import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()
const mongouri = process.env.MONGO_URI

const connecttomongo = async () => {
    mongoose.connect(mongouri)
    console.log("connected to mongoes")
}
export default connecttomongo