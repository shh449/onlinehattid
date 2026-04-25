import jwt from "jsonwebtoken"
import dotenv from "dotenv"
dotenv.config()
const jwtkey = process.env.JWT_SECRET
const fetchuser = (req, res, next) => {
    const token = req.header("auth-token")
    if (!token) {
        return res.status(401).json({ success: false, message: "token expire or not correct" })
    }
    try {

        const data = jwt.verify(token, jwtkey)
        req.user = data.user
        next()
    } catch (error) {
        return res.status(401).json({ success: false, message: "internal error" })
    }
}
export default fetchuser