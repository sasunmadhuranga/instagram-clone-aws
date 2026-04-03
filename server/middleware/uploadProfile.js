import createS3Upload from "./s3Upload.js";

const uploadProfile = createS3Upload(
  "profile",
  ["image/"],
  3
);
export default uploadProfile; 