import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  fileUrl: string;
  publicId: string;
}

export const uploadToCloudinary = async (
  filePath: string
): Promise<CloudinaryUploadResult> => {
  try {
    const isCloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET;

    if (!isCloudinaryConfigured) {
      // Fallback to local server URL if Cloudinary is not configured
      const filename = filePath.split(/[/\\]/).pop();
      return {
        fileUrl: `http://localhost:${process.env.PORT || 5000}/uploads/resumes/${filename}`,
        publicId: `local_${filename}`,
      };
    }

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "raw",
      folder: "careerai/resumes",
    });

    // Delete temporary local file after uploading to Cloudinary
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      fileUrl: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    // Ensure temporary file cleanup on failure
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Failed to delete temp file:", err);
      }
    }
    throw error;
  }
};

export const deleteFromCloudinary = async (
  publicId: string
): Promise<void> => {
  try {
    if (publicId && !publicId.startsWith("local_")) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: "raw",
      });
    }
  } catch (error) {
    console.error("Error deleting Cloudinary asset:", error);
  }
};

export default cloudinary;
