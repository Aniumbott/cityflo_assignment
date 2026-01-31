import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { uploadInvoices } from '../api/invoices';
import type { InvoiceCategory } from '../types';

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function UploadPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<InvoiceCategory | ''>('');
  const [notes, setNotes] = useState('');

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const remaining = MAX_FILES - files.length;
      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        return;
      }
      const toAdd = acceptedFiles.slice(0, remaining);
      if (acceptedFiles.length > remaining) {
        toast.error(`Only ${remaining} more file(s) can be added`);
      }
      setFiles((prev) => [...prev, ...toAdd]);
    },
    [files.length],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: MAX_SIZE,
    onDropRejected: (rejections) => {
      for (const rejection of rejections) {
        for (const error of rejection.errors) {
          if (error.code === 'file-too-large') {
            toast.error(`${rejection.file.name} exceeds 10MB limit`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${rejection.file.name} is not a PDF`);
          }
        }
      }
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: () => uploadInvoices(files, category as InvoiceCategory, notes || undefined),
    onSuccess: (data) => {
      const count = data.invoices.length;
      toast.success(`${count} invoice${count > 1 ? 's' : ''} uploaded successfully`);
      navigate('/submissions');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Upload failed. Please try again.';
      toast.error(message);
    },
  });

  const canSubmit = files.length > 0 && category !== '' && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate();
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink dark:text-cloud">Upload Invoice</h1>
        <p className="mt-1 text-sm text-slate dark:text-ash">
          Upload PDF invoices for processing. Up to {MAX_FILES} files, 10MB each.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Dropzone card */}
        <Card className="mb-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-brand bg-brand/5 dark:bg-brand/10'
                : 'border-border-light dark:border-border-dark hover:border-brand/50 dark:hover:border-brand/50 hover:bg-brand/5 dark:hover:bg-brand/10'
            }`}
          >
            <input {...getInputProps()} data-testid="file-input" />
            <div className="flex flex-col items-center gap-3">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isDragActive
                    ? 'bg-brand/20 text-brand-hover'
                    : 'bg-surface-hover dark:bg-charcoal-hover text-slate dark:text-ash'
                }`}
              >
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink dark:text-cloud">
                  {isDragActive ? 'Drop files here' : 'Drag & drop PDF files here'}
                </p>
                <p className="mt-1 text-xs text-slate dark:text-ash">
                  or click to browse — PDF only, max 10MB
                </p>
              </div>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-slate dark:text-ash uppercase tracking-wide">
                {files.length} file{files.length > 1 ? 's' : ''} selected
              </p>
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface-hover dark:bg-charcoal-hover"
                >
                  <FileText className="h-5 w-5 text-brand shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink dark:text-cloud truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate dark:text-ash">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 rounded-lg text-slate dark:text-ash hover:text-error dark:hover:text-error-dark hover:bg-surface dark:hover:bg-charcoal transition-colors"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Details card */}
        <Card className="mb-6">
          <div className="space-y-5">
            {/* Category */}
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-semibold text-ink dark:text-cloud mb-1.5"
              >
                Category <span className="text-error dark:text-error-dark">*</span>
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as InvoiceCategory | '')}
                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-ink dark:text-cloud focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors"
              >
                <option value="">Select a category</option>
                <option value="VENDOR_PAYMENT">Vendor Payment</option>
                <option value="REIMBURSEMENT">Reimbursement</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-semibold text-ink dark:text-cloud mb-1.5"
              >
                Notes <span className="text-slate dark:text-ash font-normal">(optional)</span>
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any additional context..."
                className="w-full rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-ink dark:text-cloud placeholder:text-slate/50 dark:placeholder:text-ash/50 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-colors resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Error message */}
        {mutation.isError && (
          <div className="mb-6 flex items-center gap-2 p-3 rounded-xl bg-error/10 dark:bg-error-dark/10 text-error dark:text-error-dark text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{(mutation.error as any)?.response?.data?.error || 'Upload failed. Please try again.'}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={mutation.isPending}
          disabled={!canSubmit}
          icon={<Upload className="h-5 w-5" />}
          className="w-full rounded-full"
        >
          {mutation.isPending
            ? 'Uploading...'
            : `Upload ${files.length > 0 ? files.length : ''} Invoice${files.length !== 1 ? 's' : ''}`}
        </Button>
      </form>
    </div>
  );
}
