import Post from "../models/Post.js";
import User from "../models/User.js";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3.js";

export const createPost = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ msg: "No media uploaded" });
    }

    const mediaUrls = req.files.map(file => file.location);

    const { caption, location, hideLikes, disableComments } = req.body;

    const newPost = new Post({
      user: req.user.id,
      media: mediaUrls, // now array
      caption,
      location,
      hideLikes: hideLikes === "true",
      disableComments: disableComments === "true",
    });

    await newPost.save();

    res.status(201).json({ post: newPost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creating post" });
  }
};

export const getFeedPosts = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id).populate("following");

    const followedUserIds = currentUser.following.map((user) => user._id);

    const posts = await Post.find({
      user: { $in: [...followedUserIds, req.user.id] },
    })
      .sort({ createdAt: -1 })
      .populate("user", "username photo")
      .lean();

  

    const formattedPosts = posts.map((post) => ({
      ...post,

      media: post.media, // already full S3 URLs

      user: {
        ...post.user,
        photo: post.user.photo || "", // already S3 URL if stored properly
      },

      likedByCurrentUser: post.likes?.some(
        (id) => id.toString() === req.user.id
      ),

      likesCount: post.likes?.length || 0,
    }));


    res.status(200).json(formattedPosts);
  } catch (err) {
    console.error("Feed fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch feed" });
  }
};

export const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: "Post not found" });

    const userId = req.user.id;
    const hasLiked = post.likes.includes(userId);

    if (hasLiked) {
      post.likes = post.likes.filter(id => id.toString() !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.status(200).json({ liked: !hasLiked, likesCount: post.likes.length });
  } catch (err) {
    console.error("Toggle like error:", err);
    res.status(500).json({ msg: "Failed to like/unlike post" });
  }
};

export const addComment = async (req, res) => {
  const { text } = req.body;
  const postId = req.params.id;

  if (!text) return res.status(400).json({ msg: "Comment text required" });

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.disableComments) {
      return res.status(403).json({ msg: "Commenting is disabled on this post" });
    }

    const user = await User.findById(req.user._id);

    const comment = {
      userId: user._id,
      username: user.username,
      text,
    };

    post.comments.push(comment);
    await post.save();

    res.status(200).json(post.comments);
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ msg: "Failed to add comment" });
  }
};


export const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    if (comment.userId.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized to delete this comment" });

    post.comments = post.comments.filter(
      (c) => c._id.toString() !== commentId
    );

    await post.save();

    res.status(200).json(post.comments);
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ msg: "Failed to delete comment" });
  }
};

export const toggleSavePost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const postId = req.params.id;

    if (!user) return res.status(404).json({ msg: "User not found" });

    const alreadySaved = user.savedPosts.includes(postId);

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId
      );
    } else {
      user.savedPosts.push(postId);
    }

    await user.save();
    res.status(200).json({ saved: !alreadySaved });
  } catch (err) {
    console.error("Toggle save error:", err);
    res.status(500).json({ msg: "Failed to save/unsave post" });
  }
};


export const getMyPosts = async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate("user", "username photo")
      .lean();


    const formattedPosts = posts.map((post) => ({
      ...post,

      media: post.media, // already full S3 URLs

      user: {
        ...post.user,
        photo: post.user.photo || "", // already S3 URL if stored properly
      },

      likedByCurrentUser: post.likes?.some(
        (id) => id.toString() === req.user.id
      ),

      likesCount: post.likes?.length || 0,
    }));

    res.status(200).json(formattedPosts);
  } catch (err) {
    console.error("My posts fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch your posts" });
  }
};


export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();

    const posts = await Post.find({ 
        _id: { $in: user.savedPosts || [] } 
      })
      .sort({ createdAt: -1 })
      .populate("user", "username photo")
      .lean();


    const formattedPosts = posts.map((post) => ({
      ...post,

      media: post.media, // already full S3 URLs

      user: {
        ...post.user,
        photo: post.user.photo || "", // already S3 URL if stored properly
      },

      likedByCurrentUser: post.likes?.some(
        (id) => id.toString() === req.user.id
      ),

      likesCount: post.likes?.length || 0,
    }));

    res.status(200).json(formattedPosts);
  } catch (err) {
    console.error("Saved posts fetch error:", err);
    res.status(500).json({ msg: "Failed to fetch saved posts" });
  }
};


export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.user.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized to delete this post" });

    const getKeyFromUrl = (url) => url.split(".com/")[1];

    // ✅ delete all media from S3
    for (const url of post.media) {
      const key = getKeyFromUrl(url);

      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      }));
    }

    // ✅ delete post from DB
    await Post.findByIdAndDelete(req.params.id);

    res.status(200).json({ msg: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete post error:", err);
    res.status(500).json({ msg: "Failed to delete post" });
  }
};


export const updatePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    let post = await Post.findById(postId);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.user.toString() !== userId.toString()) {
      return res.status(403).json({ msg: "Not authorized to update this post" });
    }


    const getKeyFromUrl = (url) => url.split(".com/")[1];

    if (req.files && req.files.length > 0) {

      // 🔥 delete old media from S3
      for (const url of post.media) {
        const key = getKeyFromUrl(url);

        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
        }));
      }

      // ✅ set new media
      post.media = req.files.map(file => file.location);
    }

    if (req.body.caption !== undefined) post.caption = req.body.caption;
    if (req.body.location !== undefined) post.location = req.body.location;
    if (req.body.hideLikes !== undefined) post.hideLikes = req.body.hideLikes === "true";
    if (req.body.disableComments !== undefined) post.disableComments = req.body.disableComments === "true";

    await post.save();

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: "Server error" });
  }
};


export const getPostsByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate("user", "username photo")
      .lean();

    const formattedPosts = posts.map((post) => ({
      ...post,

      media: post.media, // already full S3 URLs

      user: {
        ...post.user,
        photo: post.user.photo || "", // already S3 URL if stored properly
      },

      likedByCurrentUser: post.likes?.some(
        (id) => id.toString() === req.user.id
      ),

      likesCount: post.likes?.length || 0,
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({ msg: "Server error" });
  }
};
