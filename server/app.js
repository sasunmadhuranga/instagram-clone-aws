import 'dotenv/config';
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js"; 
import userRoutes from './routes/userRoutes.js';
import postRoutes from "./routes/postRoutes.js";

console.log("AWS_BUCKET_NAME:", process.env.AWS_BUCKET_NAME);
const PORT = process.env.PORT || 5000;
const app = express();  

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.url);
  next();
});


app.use("/api/auth", authRoutes);  
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));