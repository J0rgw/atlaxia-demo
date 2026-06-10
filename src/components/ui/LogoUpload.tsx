import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { api, resolveStaticUrl } from '@/lib/api';

interface LogoUploadProps {
  value: string | null;
  onChange: (url: string | null) => void;
  language?: 'es' | 'en';
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export function LogoUpload({ value, onChange, language = 'es' }: LogoUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(language === 'es' ? 'Solo se aceptan archivos PNG, JPG o SVG' : 'Only PNG, JPG or SVG files accepted');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(language === 'es' ? 'El archivo no debe superar 2MB' : 'File must not exceed 2MB');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const result = await api.upload<{ logo_url: string }>('/api/installation/logo', file);
      onChange(result.logo_url);
    } catch {
      setError(language === 'es' ? 'Error al subir el logo' : 'Error uploading logo');
    } finally {
      setUploading(false);
    }
  }, [onChange, language]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          'relative flex items-center gap-4 border-2 border-dashed rounded-md p-4 cursor-pointer transition-all duration-200',
          dragging
            ? 'border-[var(--accent-primary)] bg-[var(--bg-inset)]'
            : 'border-[var(--border-default)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-inset)]',
          error && 'border-[var(--status-critical)]/60 bg-[var(--status-critical-muted)]'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          onChange={handleFileChange}
          aria-label="Upload logo image"
          className="hidden"
        />

        <div className="w-20 h-20 bg-[var(--bg-inset)] rounded-lg flex items-center justify-center border border-[var(--border-subtle)] flex-shrink-0 overflow-hidden">
          {uploading ? (
            <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : value ? (
            <img src={resolveStaticUrl(value) || value} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {value ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-[var(--text-secondary)] truncate">{value.split('/').pop()}</span>
              <button
                type="button"
                onClick={handleRemove}
                className="px-2 py-1 text-xs font-medium text-[var(--status-critical)] bg-[var(--status-critical-muted)] rounded hover:opacity-80 transition-opacity"
              >
                {language === 'es' ? 'Eliminar' : 'Remove'}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {language === 'es' ? 'Arrastra una imagen o haz clic para seleccionar' : 'Drag an image or click to select'}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">PNG, JPG o SVG. Max 2MB</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-sm text-[var(--status-critical)]">{error}</p>
      )}
    </div>
  );
}
