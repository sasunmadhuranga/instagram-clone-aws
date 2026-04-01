import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import uploadPost from "../middleware/uploadPost.js";
import {
  createPost,
  getFeedPosts,
  toggleLikePost,
  addComment,
  deleteComment,
  toggleSavePost,
  getMyPosts,
  getSavedPosts,
  deletePost,
  updatePost,
  getPostsByUsername,
} from "../controllers/postController.js";

const router = express.Router();

router.get("/feed", protect, getFeedPosts);
router.get("/my-posts", protect, getMyPosts);
router.get("/saved-posts", protect, getSavedPosts);
router.get("/user/:username", protect, getPostsByUsername);

router.post("/", protect, uploadPost.array("media", 5), createPost);
router.put("/:id", protect, uploadPost.array("media", 5), updatePost);
router.delete("/:id", protect, deletePost);

router.put("/like/:id", protect, toggleLikePost);
router.put("/save/:id", protect, toggleSavePost);

router.put("/comment/:id", protect, addComment);
router.delete("/:id/comment/:commentId", protect, deleteComment);

export default router;