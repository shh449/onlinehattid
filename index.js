import express from "express"
import dotenv from "dotenv"
import connecttomongo from "./db.js"
import cors from "cors"
import autroute from "./routes/auth.js"
import productroute from "./routes/productlist.js"
import cartroute from "./routes/cartroute.js"
import orderroute from "./routes/orderroute.js"
import paymentroute from "./routes/payment.js"
import adminRoutes from "./routes/admin.js";
import uploadRoute from "./routes/upload.js";
import path from "path";
dotenv.config()
connecttomongo()

const app = express()
const port = process.env.PORT
app.use(cors({
    origin: ["http://localhost:5173", "https://your-frontend-domain.com"],
    credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.json())

app.use("/api/auth", autroute)
app.use("/api/product", productroute)
app.use("/api/cart", cartroute)
app.use("/api/order", orderroute)
app.use("/api/payment", paymentroute)
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/upload", uploadRoute);

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


