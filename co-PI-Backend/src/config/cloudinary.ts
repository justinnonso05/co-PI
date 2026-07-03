import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import 'dotenv/config';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import { Request } from 'express';

// Configure Multer Storage Engine to stream directly to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {
    return {
      folder: 'crmp_uploads', // The folder in your Cloudinary account
      allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'docx', 'csv'],
      resource_type: 'auto', // Automatically detect whether it is an image or raw file (like pdf/csv)
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
    };
  },
});

// Create Multer instance
export const upload = multer({ storage: storage });
export { cloudinary };
