import { toast } from "react-toastify";
const API_URL = process.env.REACT_APP_API_URL;
export const uploadProfilePhoto = async (file, token, setForm, closeModal) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch(`${API_URL}/users/upload-photo`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Non-JSON response:", text);
      toast.error("Server error (invalid response)");
      return;
    }

    if (res.ok) {
      const updatedPhoto = data.photo;

      setForm((prev) => ({
        ...prev,
        photo: updatedPhoto + "?t=" + new Date().getTime(),
      }));

      localStorage.setItem(
        "user",
        JSON.stringify({ ...data, token, photo: updatedPhoto })
      );

      closeModal();
      toast.success("Profile photo uploaded successfully!");
    } else {
      toast.error(data.msg || "Upload failed.");
    }
  } catch (err) {
    console.error("Upload error:", err);
    toast.error("Server error during upload.");
  }
};

export const removeProfilePhoto = async (token, setForm, closeModal) => {
  try {
    const res = await fetch(`${API_URL}/users/remove-photo`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Non-JSON response:", text);
      toast.error("Server error (invalid response)");
      return;
    }

    if (res.ok) {
      setForm((prev) => ({ ...prev, photo: "" }));

      localStorage.setItem("user", JSON.stringify({ ...data, token, photo: "" }));

      closeModal();
      toast.success("Profile photo removed successfully!");
    } else {
      toast.error(data.msg || "Failed to remove photo.");
    }
  } catch (err) {
    console.error("Remove photo error:", err);
    toast.error("Server error during photo removal.");
  }
};
