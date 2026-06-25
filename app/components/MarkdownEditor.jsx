"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[480px] border border-gray-300 rounded-md bg-gray-50 animate-pulse" />
  ),
});

export default function MarkdownEditor({ value = "", onChange }) {
  const handleChange = (val) => {
    onChange({ target: { name: "content", value: val ?? "" } });
  };

  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={handleChange}
        height={480}
        preview="live"
      />
    </div>
  );
}
