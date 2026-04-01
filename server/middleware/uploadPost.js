// middleware/uploadPost.js
import createS3Upload from "./s3Upload.js";

const uploadPost = createS3Upload(
  "posts",
  ["image/", "video/"],
  20
);
export default uploadPost;