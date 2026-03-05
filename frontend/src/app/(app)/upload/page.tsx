"use client";

import { useState, useRef, useCallback, useMemo, type DragEvent, type ChangeEvent } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Calendar,
  Hash,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Copy,
  Tag,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { useImport } from "@/lib/hooks/useImport";
import {
  parseCaixaBankCSV,
  type ParseResult,
} from "@/lib/classification/parser";

// ─── Step Indicator ─────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { num: 1, label: "Archivo" },
    { num: 2, label: "Vista previa" },
    { num: 3, label: "Resultado" },
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
                current === step.num
                  ? "gradient-primary text-white shadow-lg shadow-primary/30 scale-110"
                  : current > step.num
                    ? "bg-success text-white"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {current > step.num ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                step.num
              )}
            </div>
            <span
              className={cn(
                "hidden text-sm font-medium transition-colors duration-300 sm:inline",
                current === step.num
                  ? "text-foreground"
                  : current > step.num
                    ? "text-success"
                    : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-8 transition-colors duration-500 sm:w-12",
                current > step.num + 1
                  ? "bg-success"
                  : current > step.num
                    ? "bg-primary"
                    : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: File Selection ─────────────────────────────────────────

interface StepFileProps {
  onFileParsed: (file: File, parseResult: ParseResult) => void;
}

function StepFile({ onFileParsed }: StepFileProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isReading, setIsReading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setParseErrors(["El archivo debe ser un fichero CSV (.csv)"]);
        return;
      }

      setParseErrors([]);
      setIsReading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
          setParseErrors(["No se pudo leer el contenido del archivo"]);
          setIsReading(false);
          return;
        }

        const result = parseCaixaBankCSV(content);

        if (result.transactions.length === 0) {
          setParseErrors(
            result.errors.length > 0
              ? result.errors
              : ["No se encontraron transacciones validas en el archivo"]
          );
          setIsReading(false);
          return;
        }

        setIsReading(false);
        onFileParsed(file, result);
      };
      reader.onerror = () => {
        setParseErrors(["Error al leer el archivo"]);
        setIsReading(false);
      };
      reader.readAsText(file, "UTF-8");
    },
    [onFileParsed]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div className="animate-in flex flex-col items-center gap-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "group relative w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-12",
          isDragging
            ? "border-primary bg-accent scale-[1.02] shadow-lg shadow-primary/10"
            : "border-border bg-card hover:border-primary/50 hover:bg-accent/50 hover:shadow-md",
          isReading && "pointer-events-none opacity-60"
        )}
      >
        {/* Background decoration */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 transition-opacity duration-300",
            isDragging ? "opacity-100" : "group-hover:opacity-100"
          )}
        />

        <div className="relative flex flex-col items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300",
              isDragging
                ? "gradient-primary shadow-lg shadow-primary/30 scale-110"
                : "bg-primary/10 group-hover:bg-primary/15 group-hover:scale-105"
            )}
          >
            {isReading ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <Upload
                className={cn(
                  "h-7 w-7 transition-all duration-300",
                  isDragging
                    ? "text-white -translate-y-0.5"
                    : "text-primary group-hover:-translate-y-0.5"
                )}
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <p
              className={cn(
                "text-base font-semibold transition-colors duration-300 sm:text-lg",
                isDragging ? "text-primary" : "text-foreground"
              )}
            >
              {isReading
                ? "Leyendo archivo..."
                : "Arrastra tu archivo CSV aqui"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isReading ? (
                "Procesando el contenido del archivo"
              ) : (
                <>
                  o{" "}
                  <span className="font-medium text-primary underline underline-offset-2">
                    selecciona un archivo
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1.5">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Formato: CSV de CaixaBank (.csv)
            </span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Seleccionar archivo CSV"
        />
      </div>

      {/* Parse Errors */}
      {parseErrors.length > 0 && (
        <div className="animate-in w-full rounded-xl border border-danger/20 bg-danger/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-danger/10">
              <AlertCircle className="h-4 w-4 text-danger" />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-semibold text-danger">
                Error al procesar el archivo
              </p>
              {parseErrors.map((err, i) => (
                <p key={i} className="text-xs text-danger/80">
                  {err}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Preview ────────────────────────────────────────────────

interface StepPreviewProps {
  file: File;
  parseResult: ParseResult;
  onImport: () => void;
  onCancel: () => void;
  isImporting: boolean;
}

function StepPreview({
  file,
  parseResult,
  onImport,
  onCancel,
  isImporting,
}: StepPreviewProps) {
  const { transactions, errors } = parseResult;

  const previewRows = transactions.slice(0, 10);

  const dateRange = useMemo(() => {
    if (transactions.length === 0) return null;
    const dates = transactions.map((t) => t.date).sort();
    return { first: dates[0], last: dates[dates.length - 1] };
  }, [transactions]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      if (t.amount >= 0) income += t.amount;
      else expense += t.amount;
    }
    return { income, expense };
  }, [transactions]);

  return (
    <div className="animate-in flex flex-col gap-5">
      {/* Summary Card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {transactions.length} transacciones encontradas
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Total */}
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
            <p className="mt-1 text-lg font-bold text-foreground">
              {transactions.length}
            </p>
          </div>

          {/* Date Range */}
          <div className="rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Periodo</span>
            </div>
            <p className="mt-1 text-xs font-semibold text-foreground sm:text-sm">
              {dateRange
                ? `${formatDate(dateRange.first)} - ${formatDate(dateRange.last)}`
                : "-"}
            </p>
          </div>

          {/* Income */}
          <div className="rounded-xl bg-success/5 p-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="text-xs text-success/70">Ingresos</span>
            </div>
            <p className="mt-1 text-sm font-bold text-success">
              {formatCurrency(totals.income)}
            </p>
          </div>

          {/* Expenses */}
          <div className="rounded-xl bg-danger/5 p-3">
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-danger" />
              <span className="text-xs text-danger/70">Gastos</span>
            </div>
            <p className="mt-1 text-sm font-bold text-danger">
              {formatCurrency(totals.expense)}
            </p>
          </div>
        </div>
      </div>

      {/* Parse Warnings */}
      {errors.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
            <div>
              <p className="text-xs font-semibold text-warning">
                {errors.length} fila{errors.length !== 1 ? "s" : ""} con
                advertencias
              </p>
              <p className="mt-0.5 text-xs text-warning/70">
                Estas filas se han ignorado del total
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            Vista previa{" "}
            <span className="font-normal text-muted-foreground">
              (primeras {previewRows.length} filas)
            </span>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Fecha
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Concepto
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                  Importe
                </th>
                <th className="hidden px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground sm:table-cell">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((tx, i) => (
                <tr
                  key={i}
                  className={cn(
                    "border-b border-border/50 transition-colors last:border-0 hover:bg-muted/20",
                    i % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                  )}
                  style={{
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">
                    {formatDate(tx.date)}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-2.5 text-sm text-foreground sm:max-w-[300px]">
                    {tx.concept}
                  </td>
                  <td
                    className={cn(
                      "whitespace-nowrap px-4 py-2.5 text-right text-sm font-semibold",
                      tx.amount >= 0 ? "text-success" : "text-danger"
                    )}
                  >
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-2.5 text-right text-sm text-muted-foreground sm:table-cell">
                    {tx.balance != null ? formatCurrency(tx.balance) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length > 10 && (
          <div className="border-t border-border px-4 py-2.5 text-center text-xs text-muted-foreground">
            ... y {transactions.length - 10} transacciones mas
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          onClick={onCancel}
          disabled={isImporting}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200",
            "hover:bg-muted hover:shadow-sm",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          Cancelar
        </button>
        <button
          onClick={onImport}
          disabled={isImporting}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200",
            "gradient-primary shadow-md shadow-primary/25",
            "hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02]",
            "active:scale-[0.98]",
            "disabled:pointer-events-none disabled:opacity-60"
          )}
        >
          {isImporting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Importando...
            </>
          ) : (
            <>
              Importar {transactions.length} transacciones
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Progress & Results ─────────────────────────────────────

interface StepResultsProps {
  progress: {
    stage: string;
    current: number;
    total: number;
    message: string;
  };
  result: {
    totalRows: number;
    newRows: number;
    duplicateRows: number;
    autoClassified: number;
    unclassified: number;
    parseErrors: string[];
    importId: string | null;
  } | null;
  error: string | null;
  isImporting: boolean;
  onReset: () => void;
}

const stageLabels: Record<string, string> = {
  parsing: "Leyendo archivo CSV...",
  "loading-rules": "Cargando reglas de clasificacion...",
  classifying: "Clasificando transacciones...",
  inserting: "Guardando transacciones...",
  "updating-summaries": "Actualizando resumenes mensuales...",
  completed: "Importacion completada",
  error: "Error en la importacion",
};

function StepResults({
  progress,
  result,
  error,
  isImporting,
  onReset,
}: StepResultsProps) {
  const percentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  // Show progress during import
  if (isImporting) {
    return (
      <div className="animate-in flex flex-col items-center gap-6 py-8">
        {/* Progress Circle & Text */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="var(--muted)"
                strokeWidth="6"
              />
              <circle
                cx="48"
                cy="48"
                r="42"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - percentage / 100)}`}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute text-xl font-bold text-primary">
              {percentage}%
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              {stageLabels[progress.stage] || progress.message || "Procesando..."}
            </p>

            {progress.total > 0 && (
              <p className="text-xs text-muted-foreground">
                {progress.current} de {progress.total}
              </p>
            )}

            {/* Pulsing dots */}
            <div className="flex items-center gap-1 pt-1">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
              />
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                style={{
                  animation: "pulse-dot 1.4s ease-in-out 0.2s infinite",
                }}
              />
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                style={{
                  animation: "pulse-dot 1.4s ease-in-out 0.4s infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full gradient-primary transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Show error
  if (error) {
    return (
      <div className="animate-in flex flex-col items-center gap-6 py-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
          <AlertCircle className="h-8 w-8 text-danger" />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-lg font-bold text-foreground">
            Error en la importacion
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
        </div>
        <button
          onClick={onReset}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200",
            "hover:bg-muted hover:shadow-sm"
          )}
        >
          <RotateCcw className="h-4 w-4" />
          Intentar de nuevo
        </button>
      </div>
    );
  }

  // Show results
  if (!result) return null;

  return (
    <div className="animate-in flex flex-col gap-6">
      {/* Success Card */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-success/20 bg-success/5 p-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
          style={{ animation: "success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        >
          <CheckCircle2 className="h-9 w-9 text-success" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">
            Importacion completada
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Se han procesado todas las transacciones correctamente
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Processed */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Hash className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-foreground">
            {result.totalRows}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Total procesadas
          </p>
        </div>

        {/* New Rows */}
        <div className="rounded-2xl border border-success/20 bg-success/5 p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-success">
            {result.newRows}
          </p>
          <p className="mt-0.5 text-xs text-success/70">Nuevas</p>
        </div>

        {/* Duplicates */}
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10">
              <Copy className="h-4 w-4 text-warning" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-warning">
            {result.duplicateRows}
          </p>
          <p className="mt-0.5 text-xs text-warning/70">Duplicadas</p>
        </div>

        {/* Auto-classified */}
        <div className="rounded-2xl border border-primary/20 bg-accent p-4 shadow-sm transition-all duration-300 hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-primary">
            {result.autoClassified}
          </p>
          <p className="mt-0.5 text-xs text-primary/70">Auto-clasificadas</p>
        </div>
      </div>

      {/* Unclassified CTA */}
      {result.unclassified > 0 && (
        <Link
          href="/transactions?filter=unclassified"
          className={cn(
            "group flex items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-accent/50 p-5 transition-all duration-300",
            "hover:border-primary/50 hover:bg-accent hover:shadow-md"
          )}
        >
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 transition-transform duration-300 group-hover:scale-110">
            <Tag className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">
              Clasificar {result.unclassified} transacciones pendientes
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Estas transacciones necesitan clasificacion manual
            </p>
          </div>
          <ArrowRight className="h-5 w-5 flex-shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}

      {/* Reset Button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className={cn(
            "flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-200",
            "hover:bg-muted hover:shadow-sm",
            "active:scale-[0.98]"
          )}
        >
          <RotateCcw className="h-4 w-4" />
          Importar otro archivo
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function UploadPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const { importCSV, progress, result, error, reset, isImporting } =
    useImport();

  const handleFileParsed = useCallback(
    (file: File, parsed: ParseResult) => {
      setSelectedFile(file);
      setParseResult(parsed);
      setStep(2);
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!selectedFile) return;
    setStep(3);
    await importCSV(selectedFile);
  }, [selectedFile, importCSV]);

  const handleCancel = useCallback(() => {
    setSelectedFile(null);
    setParseResult(null);
    setStep(1);
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setSelectedFile(null);
    setParseResult(null);
    setStep(1);
  }, [reset]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes pulse-dot {
              0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1.2); }
            }
            @keyframes success-pop {
              0% { opacity: 0; transform: scale(0.5); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes animate-in {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-in {
              animation: animate-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }
          `,
        }}
      />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground sm:text-xl">
              Importar extracto
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Sube tu fichero CSV de CaixaBank
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} />
      </div>

      {/* Step Content */}
      <div key={step}>
        {step === 1 && <StepFile onFileParsed={handleFileParsed} />}

        {step === 2 && selectedFile && parseResult && (
          <StepPreview
            file={selectedFile}
            parseResult={parseResult}
            onImport={handleImport}
            onCancel={handleCancel}
            isImporting={isImporting}
          />
        )}

        {step === 3 && (
          <StepResults
            progress={progress}
            result={result}
            error={error}
            isImporting={isImporting}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
