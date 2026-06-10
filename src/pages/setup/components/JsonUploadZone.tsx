import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { validatePlantSurvey } from '@/lib/plantSurveyParser';
import type { PlantSurvey } from '@/types/plantSurvey';

interface JsonUploadZoneProps {
  onImport: (data: PlantSurvey) => void;
}

export function JsonUploadZone({ onImport }: JsonUploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('Solo se aceptan archivos .json');
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        const validation = validatePlantSurvey(parsed);
        if (!validation.valid) {
          setError(validation.error || 'JSON invalido');
          setLoading(false);
          return;
        }
        onImport(parsed as PlantSurvey);
      } catch {
        setError('Error al leer el archivo JSON');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Error al leer el archivo');
      setLoading(false);
    };
    reader.readAsText(file);
  }, [onImport]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

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
    if (file) processFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={cn(
        'relative border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-all duration-200',
        dragging
          ? 'border-[var(--status-normal)] bg-[var(--status-normal-muted)] scale-[1.01]'
          : 'border-[var(--border-default)] hover:border-[var(--status-normal)] hover:bg-[var(--bg-inset)]',
        error && 'border-[var(--status-critical)] bg-[var(--status-critical-muted)]'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        aria-label="Upload JSON file"
        className="hidden"
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)]">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">Procesando...</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-2">
            <div className={cn(
              'w-12 h-12 rounded-md flex items-center justify-center transition-colors',
              dragging ? 'bg-[var(--status-normal-muted)] text-[var(--status-normal)]' : 'bg-[var(--bg-inset)] text-[var(--text-muted)]'
            )}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                Arrastra tu <span className="font-readout text-[var(--status-normal)]">plant_survey.json</span> aqui
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                o haz clic para seleccionar el archivo
              </p>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-[var(--status-critical)] bg-[var(--status-critical-muted)] rounded-lg px-3 py-1.5 inline-block">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
