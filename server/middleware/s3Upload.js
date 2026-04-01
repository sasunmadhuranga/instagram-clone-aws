import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3.js";

const createS3Upload = (folder, allowedTypes, maxSizeMB = 10) => {
  return multer({
    storage: multerS3({
      s3,
      bucket: process.env.AWS_BUCKET_NAME,
      acl: "public-read",

      contentType: multerS3.AUTO_CONTENT_TYPE,

      key: (req, file, cb) => {
        const fileName = `${folder}/${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}`;
        cb(null, fileName);
      },
    }),

    fileFilter: (req, file, cb) => {
      if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type"), false);
      }
    },

    limits: {
      fileSize: maxSizeMB * 1024 * 1024,
    },
  });
};

export default createS3Upload;