import { useRef, useState } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { uploadResumeApi } from "../../features/resume/resume.service";
import type { ResumeData } from "../../types/resume";
import axios from "axios";

interface ResumeUploadCardProps {
  onUploadSuccess?: (resume: ResumeData) => void;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function ResumeUploadCard({ onUploadSuccess }: ResumeUploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

  const validateAndUploadFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      setErrorMessage("Unsupported file format. Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(`File is too large (${formatFileSize(file.size)}). Maximum allowed size is 5 MB.`);
      return;
    }

    setSelectedFile(file);
    await handleBackendUpload(file);
  };

  const handleBackendUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setErrorMessage(null);

      const response = await uploadResumeApi(file);

      if (response.success && response.data) {
        setSuccessMessage("Resume uploaded successfully!");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (onUploadSuccess) {
          onUploadSuccess(response.data);
        }
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message || "Failed to upload resume. Please try again."
        );
      } else {
        setErrorMessage("An unexpected error occurred during upload.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUploadFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-3xl border border-gray-100 bg-white p-6 md:p-8 shadow-xl shadow-gray-100/50">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
          Upload Your Resume
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Upload your resume to get instant AI analysis, ATS score, and optimization tips.
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
        id="resume-file-input"
      />

      {/* Drag & Drop Area / Selected File Display */}
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all duration-200 cursor-pointer ${
            isDragging
              ? "border-blue-600 bg-blue-50/60 scale-[1.01]"
              : "border-gray-200 hover:border-blue-500 hover:bg-gray-50/60"
          }`}
        >
          {/* Icon / Spinner */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm transition group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8" />
            )}
          </div>

          {/* Prompt */}
          <div className="mt-6 space-y-2">
            <p className="text-base font-semibold text-gray-900">
              {isUploading ? "Uploading Resume to Cloud..." : "Drag & Drop your resume here"}
            </p>
            <p className="text-sm text-gray-500">
              {isUploading ? "Please wait while we process your file" : "or click below to browse files from your computer"}
            </p>
          </div>

          {/* Large Upload Resume Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              triggerFileInput();
            }}
            className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:opacity-60 active:scale-95"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Upload Resume
              </>
            )}
          </button>

          {/* Helper Text */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-gray-400">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
              Supported formats: PDF, DOC, DOCX
            </span>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">
              Maximum size: 5 MB
            </span>
          </div>
        </div>
      ) : (
        /* Selected File Card */
        <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                {isUploading ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <FileText className="h-7 w-7" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-gray-900 text-base" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  {!isUploading && <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                </div>
                <p className="mt-1 text-sm font-medium text-gray-500">
                  Size: {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              {!isUploading && (
                <>
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    Change File
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 active:scale-95"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 border border-emerald-100">
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-100">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

export default ResumeUploadCard;
