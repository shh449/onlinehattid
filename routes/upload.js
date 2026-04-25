import express from "express";
import multer from "multer";
import path from "path";
import fetchuser from "../middleware/fetchuser.js";
import admin from "../middleware/admin.js";

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

// Storage config
const upload = multer({ storage: multer.memoryStorage() });

// Upload image
router.post("/image", fetchuser, admin, upload.single("image"), async (req, res) => {
    try {
        const file = req.file;



        if (!file || !file.buffer) {
            return res.status(400).json({ message: "Invalid file" });
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "onlinehatti",
                resource_type: "image"
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Error:", error);
                    return res.status(500).json({ error: error.message });
                }

                res.json({
                    imageUrl: result.secure_url,
                    public_id: result.public_id
                });
            }
        );

        stream.end(file.buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

export default router;