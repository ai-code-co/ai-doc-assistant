import { useState, useRef } from "react";
import { uploadFiles } from "../services/api";

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUpload = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setStatus("");

    try {
      const result = await uploadFiles(files);

      setStatus(
        `✅ ${result.totalFiles} file(s) uploaded | ${result.totalChunks} chunks created`,
      );

      setFiles([]); // clear files after upload
    } catch (error) {
      setStatus("❌ Upload failed");
    }

    setLoading(false);
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);

    setFiles((prevFiles) => {
      const existingNames = prevFiles.map((file) => file.name);
      const filteredNewFiles = newFiles.filter(
        (file) => !existingNames.includes(file.name),
      );

      return [...prevFiles, ...filteredNewFiles];
    });

    e.target.value = null;
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>

      {/* Hidden Real Input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Custom Button */}
      <button
        onClick={() => fileInputRef.current.click()}
        className="w-full bg-gray-800 border border-gray-700 
                   hover:bg-gray-700 transition p-3 rounded-lg 
                   text-sm font-semibold text-gray-300 mb-4"
      >
        Choose Files
      </button>

      {/* Selected File List */}
      {files.length > 0 && (
        <div className="text-sm text-gray-400 mb-3 space-y-1">
          {files.map((file, index) => (
            <div key={index} className="truncate">
              📄 {file.name}
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 
                   transition p-2 rounded-lg font-semibold"
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      {status && (
        <p
          className={`mt-3 text-sm ${
            status.startsWith("✅") ? "text-green-400" : "text-red-400"
          }`}
        >
          {status}
        </p>
      )}
    </div>
  );
};

export default FileUpload;
