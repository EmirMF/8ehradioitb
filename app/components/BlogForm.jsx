"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import AIAssistModal from "./ai/AIAssistModal";
import MarkdownEditor from "./MarkdownEditor";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

function generateSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/[^\w-]+/g, "");
}

const CATEGORY_OPTIONS = ["News", "Event", "Achievement", "Artikel", "Custom"];

// Toast Notification Component
function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === "error"
      ? "bg-red-500"
      : type === "success"
        ? "bg-green-500"
        : "bg-orange-500";
  const icon =
    type === "error" ? (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ) : type === "success" ? (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
    ) : (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in max-w-md`}
    >
      {icon}
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        type="button"
        onClick={onClose}
        className="hover:bg-white/20 rounded p-1 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

export default function BlogForm({ post: initialPost, isEditing = false }) {
  const [post, setPost] = useState({
    title: "",
    slug: "",
    content: "",
    category: "",
    description: "",
    readTime: "",
    tags: "",
    mainImage: "",
  });
  const [selectedAuthors, setSelectedAuthors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isAuthorDropdownOpen, setIsAuthorDropdownOpen] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTitleModalOpen, setIsTitleModalOpen] = useState(false);
  const [aiInitialText, setAiInitialText] = useState("");
  const [aiDefaultAction, setAiDefaultAction] = useState("outline");
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [toast, setToast] = useState(null);
  const router = useRouter();
  const authorDropdownRef = useRef(null);
  const { data: session } = useSession();
  const { data: users, error: usersError } = useSWR("/api/users", fetcher);

  const showToast = (message, type = "error") => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  useEffect(() => {
    if (session && !isEditing) setSelectedAuthors([session.user.id]);
    if (isEditing && initialPost) {
      const { tags, readTime, category, authors } = initialPost;
      setPost({
        ...initialPost,
        tags: Array.isArray(tags) ? tags.join(", ") : "",
        readTime: readTime ? parseInt(readTime, 10) || "" : "",
      });
      if (authors) setSelectedAuthors(authors.map((a) => a.user.id));
      if (category && !CATEGORY_OPTIONS.includes(category)) {
        setIsCustomCategory(true);
        setCustomCategory(category);
      }
    }
  }, [initialPost, isEditing, session]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        authorDropdownRef.current &&
        !authorDropdownRef.current.contains(event.target)
      ) {
        setIsAuthorDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [authorDropdownRef]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "category") {
      const custom = value === "Custom";
      setIsCustomCategory(custom);
      setPost((prev) => ({ ...prev, category: custom ? "" : value }));
      if (!custom) setCustomCategory("");
    } else {
      setPost((prev) => ({ ...prev, [name]: value }));
      if (name === "title")
        setPost((prev) => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleAuthorChange = (userId) => {
    setSelectedAuthors((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const handleContentImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
    );

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );
      const data = await res.json();
      if (data.secure_url) {
        const markdownImage = `\n![${file.name}](${data.secure_url})\n`;
        setPost((prev) => ({ ...prev, content: prev.content + markdownImage }));
        showToast("Gambar berhasil diupload!", "success");
      } else {
        throw new Error("Image upload failed to return a secure URL.");
      }
    } catch (err) {
      showToast("Gagal upload gambar: " + err.message, "error");
    }
    // Clear the file input
    e.target.value = null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedAuthors.length === 0) {
      showToast("Pilih minimal satu author untuk post ini.", "warning");
      return;
    }

    setIsSubmitting(true);

    let imageUrl = post.mainImage;
    if (imageFile) {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
      );

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          {
            method: "POST",
            body: formData,
          },
        );
        const data = await res.json();
        if (data.secure_url) {
          imageUrl = data.secure_url;
        } else {
          throw new Error("Image upload failed");
        }
      } catch (err) {
        showToast("Gagal upload cover image: " + err.message, "error");
        setIsSubmitting(false);
        return;
      }
    }

    const postCategory = isCustomCategory ? customCategory : post.category;
    if (!postCategory) {
      showToast("Pilih atau masukkan category untuk post ini.", "warning");
      setIsSubmitting(false);
      return;
    }

    const postData = {
      ...post,
      mainImage: imageUrl,
      tags: post.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag),
      readTime: post.readTime ? `${post.readTime} min read` : null,
      category: postCategory,
      authorIds: selectedAuthors,
    };

    const url = isEditing ? `/api/blog/${initialPost.slug}` : "/api/blog";
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save post");
      }

      router.push("/dashboard/blog");
      router.refresh();
    } catch (err) {
      showToast("Gagal menyimpan post: " + err.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // AI Helper Functions
  const handleOpenAIModal = (initialText = "") => {
    setAiInitialText(initialText);
    setAiDefaultAction("outline");
    setIsAIModalOpen(true);
  };

  const handleOpenTitleModal = () => {
    setAiInitialText("");
    setAiDefaultAction("title");
    setIsTitleModalOpen(true);
  };

  const handleAIInsert = (text) => {
    setPost((prev) => ({ ...prev, content: prev.content + "\n" + text }));
  };

  const handleTitleInsert = (text) => {
    // Clean up the title (remove quotes, extra whitespace)
    const cleanTitle = text.trim().replace(/^["']|["']$/g, "");
    setPost((prev) => ({
      ...prev,
      title: cleanTitle,
      slug: generateSlug(cleanTitle),
    }));
  };

  const handleAutoDescription = async () => {
    if (!post.content || post.content.length < 100) {
      showToast(
        "Isi Content terlebih dahulu (minimal 100 karakter) untuk generate description otomatis.",
        "warning",
      );
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post.content }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate description");
      }

      const data = await res.json();
      setPost((prev) => ({ ...prev, description: data.description }));
      showToast("Description berhasil di-generate!", "success");
    } catch (err) {
      showToast("Gagal generate description: " + err.message, "error");
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleAutoTags = async () => {
    if (!post.content || post.content.length < 50) {
      showToast(
        "Isi Content terlebih dahulu (minimal 50 karakter) untuk generate tags otomatis.",
        "warning",
      );
      return;
    }

    setIsGeneratingTags(true);
    try {
      const res = await fetch("/api/ai/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: post.content, title: post.title }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate tags");
      }

      const data = await res.json();
      setPost((prev) => ({ ...prev, tags: data.tags }));
      showToast("Tags berhasil di-generate!", "success");
    } catch (err) {
      showToast("Gagal generate tags: " + err.message, "error");
    } finally {
      setIsGeneratingTags(false);
    }
  };

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={closeToast} />
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-gray-50 p-6 sm:p-8 shadow-md rounded-lg border border-gray-200"
      >
        {/* Title & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-800 font-body"
              >
                Title
              </label>
              <button
                type="button"
                onClick={handleOpenTitleModal}
                className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 font-body transition-colors"
              >
                <span>💡</span> AI Title
              </button>
            </div>
            <input
              type="text"
              name="title"
              id="title"
              value={post.title}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              required
            />
          </div>
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-800 font-body mb-2"
            >
              Slug
            </label>
            <input
              type="text"
              name="slug"
              id="slug"
              value={post.slug}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-500 bg-gray-100 cursor-not-allowed"
              readOnly
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-800 font-body"
            >
              Content (Markdown)
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenAIModal(post.title || "")}
                className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 font-body transition-colors"
              >
                <span>✨</span> AI Assist
              </button>
              <label className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer font-body transition-colors">
                Add Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleContentImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <MarkdownEditor
            value={post.content}
            onChange={handleChange}
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex justify-between items-center">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-800 font-body mb-2"
            >
              Description
            </label>
            <button
              type="button"
              onClick={handleAutoDescription}
              disabled={isGeneratingDescription}
              className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 font-body transition-colors disabled:opacity-50"
            >
              {isGeneratingDescription ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span> Auto-fill
                </>
              )}
            </button>
          </div>
          <input
            type="text"
            name="description"
            id="description"
            value={post.description}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Authors */}
        <div className="relative" ref={authorDropdownRef}>
          <label className="block text-sm font-medium text-gray-800 font-body mb-2">
            Authors
          </label>
          <button
            type="button"
            onClick={() => {
              const next = !isAuthorDropdownOpen;
              setIsAuthorDropdownOpen(next);
              if (!next) setAuthorSearch("");
            }}
            className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {selectedAuthors.length > 0
              ? `${selectedAuthors.length} author(s) selected`
              : "Select authors..."}
          </button>
          {isAuthorDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg">
              {/* Search input */}
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  value={authorSearch}
                  onChange={(e) => setAuthorSearch(e.target.value)}
                  placeholder="Cari author..."
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md font-body text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* List */}
              <div className="max-h-52 overflow-y-auto">
                {usersError && (
                  <p className="p-4 text-red-700 font-body">
                    Failed to load users.
                  </p>
                )}
                {!users && !usersError && (
                  <p className="p-4 font-body text-gray-700">Loading users...</p>
                )}
                {users && (() => {
                  const filtered = users.filter((u) => {
                    const q = authorSearch.toLowerCase();
                    return (
                      u.name?.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q)
                    );
                  });
                  if (filtered.length === 0)
                    return (
                      <p className="p-4 text-sm text-gray-500 font-body">
                        Tidak ada author ditemukan.
                      </p>
                    );
                  return filtered.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        id={`author-${user.id}`}
                        checked={selectedAuthors.includes(user.id)}
                        onChange={() => handleAuthorChange(user.id)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`author-${user.id}`}
                        className="ml-3 block text-sm font-body text-gray-900 flex-1 cursor-pointer"
                      >
                        {user.name}{" "}
                        <span className="text-gray-500">({user.email})</span>
                      </label>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Category, Custom Category, Read Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-800 font-body mb-2"
            >
              Category
            </label>
            <select
              name="category"
              id="category"
              value={isCustomCategory ? "Custom" : post.category}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Select a category</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {isCustomCategory && (
            <div>
              <label
                htmlFor="customCategory"
                className="block text-sm font-medium text-gray-800 font-body mb-2"
              >
                Custom Category
              </label>
              <input
                type="text"
                name="customCategory"
                id="customCategory"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter custom category"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="readTime"
              className="block text-sm font-medium text-gray-800 font-body mb-2"
            >
              Read Time (minutes)
            </label>
            <input
              type="number"
              name="readTime"
              id="readTime"
              value={post.readTime}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="e.g., 5"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="flex justify-between items-center">
            <label
              htmlFor="tags"
              className="block text-sm font-medium text-gray-800 font-body mb-2"
            >
              Tags (comma-separated)
            </label>
            <button
              type="button"
              onClick={handleAutoTags}
              disabled={isGeneratingTags}
              className="flex items-center gap-1 text-sm font-medium text-orange-600 hover:text-orange-700 font-body transition-colors disabled:opacity-50"
            >
              {isGeneratingTags ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span> Suggest
                </>
              )}
            </button>
          </div>
          <input
            type="text"
            name="tags"
            id="tags"
            value={post.tags}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 p-3 rounded-md font-body text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label
            htmlFor="mainImage"
            className="block text-sm font-medium text-gray-800 font-body mb-2"
          >
            Cover Image
          </label>
          <input
            type="file"
            name="mainImage"
            id="mainImage"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm font-body text-gray-900 border border-gray-300 p-3 rounded-md bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
          {post.mainImage && !imageFile && (
            <img
              src={post.mainImage}
              alt="Current cover"
              className="mt-4 h-32 object-cover rounded-md border border-gray-200 shadow-sm"
            />
          )}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed font-body font-semibold transition-colors duration-200"
          >
            {isSubmitting
              ? "Saving..."
              : isEditing
                ? "Update Post"
                : "Create Post"}
          </button>
        </div>

        {/* AI Assist Modal for Content */}
        <AIAssistModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          onInsert={handleAIInsert}
          initialText={aiInitialText}
          defaultAction="outline"
          allowedActions={["outline", "draft", "improve", "translate"]}
        />

        {/* AI Assist Modal for Title */}
        <AIAssistModal
          isOpen={isTitleModalOpen}
          onClose={() => setIsTitleModalOpen(false)}
          onInsert={handleTitleInsert}
          initialText=""
          defaultAction="title"
          allowedActions={["title"]}
        />
      </form>
    </>
  );
}
