import express from "express";
import { body, validationResult } from "express-validator";
import User from "../Models/User.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import fetchuser from "../middleware/fetchuser.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";

dotenv.config();

const router = express.Router();
const jwtkey = process.env.JWT_SECRET;


// ============================ USER SIGNUP ROUTE ============================
router.post(
    "/signup",
    [
        body("name").isLength({ min: 3 }).withMessage("Name must be at least 3 characters long"),
        body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {

            const { name, email, password } = req.body;

            let existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ success: false, message: "User already exists" });
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = await User.create({
                name,
                email,
                password: hashedPassword,
            });

            const payload = {
                user: {
                    id: user.id,
                    role: user.role
                }
            };

            const token = jwt.sign(payload, jwtkey, { expiresIn: "7d" });

            res.status(201).json({
                success: true,
                message: "User created successfully",
                token: token,
                user: {
                    id: user.id,
                    role: user.role
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }
);


// ============================ USER LOGIN ROUTE ============================
router.post(
    "/login",
    [
        body("email").isEmail().normalizeEmail(),
        body("password").exists(),
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {

            const { email, password } = req.body;

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }

            const passwordCompare = await bcrypt.compare(password, user.password);
            if (!passwordCompare) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }

            const payload = {
                user: {
                    id: user.id,
                    role: user.role
                }
            };

            const token = jwt.sign(payload, jwtkey, { expiresIn: "7d" });

            res.status(200).json({
                success: true,
                message: "Logged in successfully",
                token: token,
                user: {
                    id: user.id,
                    role: user.role
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }
);


// ============================ FORGOT PASSWORD ROUTE ============================
router.post(
    "/forgotpassword",
    [
        body("email").isEmail().withMessage("Enter a valid email").normalizeEmail(),
    ],
    async (req, res) => {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        try {

            const { email } = req.body;

            const user = await User.findOne({ email });

            if (!user) {
                return res.status(404).json({ success: false, message: "User not found" });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString("hex");

            // Hash token and save in DB
            const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

            user.resetPasswordToken = hashedToken;
            user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

            await user.save();

            // Email setup
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });

            const resetUrl = `http://localhost:5173/resetpassword/${resetToken}`;

            const message = `
                You requested a password reset.
                Click the link below to reset password:
                ${resetUrl}
                This link will expire in 10 minutes.
            `;

            await transporter.sendMail({
                to: user.email,
                subject: "Password Reset",
                text: message,
            });

            res.status(200).json({
                success: true,
                message: "Password reset email sent"
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Email could not be sent" });
        }
    }
);


// ============================ RESET PASSWORD ROUTE ============================
router.post(
    "/resetpassword/:token",
    [
        body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    ],
    async (req, res) => {

        try {

            const resetToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

            const user = await User.findOne({
                resetPasswordToken: resetToken,
                resetPasswordExpire: { $gt: Date.now() }
            });

            if (!user) {
                return res.status(400).json({ success: false, message: "Invalid or expired token" });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);

            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save();

            res.status(200).json({
                success: true,
                message: "Password reset successful"
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }
);


// ============================ FETCH USER ROUTE ============================
router.get("/fetchuser", fetchuser, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

export default router;