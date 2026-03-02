import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useExtractions } from '@/hooks/predios/useExtractions';
import { PermissionGate } from '@/components/predios/PermissionGate';
import { PERMISSIONS } from '@/lib/predios/auth-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Loader2,
  Play,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const STATUS_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  uploaded: { label: 'Enviado', icon: Clock, variant: 'secondary' },
  processing: { label: 'Processando', icon: Loader2, variant: 'outline' },
  completed: { label: 'Concluído', icon: CheckCircle2, variant: 'default' },
  error: { label: 'Erro', icon: XCircle, variant: 'destructive' },
  reviewed: { label: 'Revisado', icon: CheckCircle2, variant: 'default' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadsContent() {
  const { extractions, isLoading, upload, uploading, process, processing, deleteExtraction, deleting } = useExtractions();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await upload(file);
    }
  }, [upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: uploading,
  });

  const handleProcess = async (id: string) => {
    setProcessingId(id);
    try {
      await process(id);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Upload className="w-6 h-6" />
          Upload de Arquivos
        </h1>
        <p className="text-muted-foreground mt-1">
          Envie arquivos PDF ou Excel para extrair informações de prédios
        </p>
      </div>

      {/* Upload zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              {uploading ? (
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              ) : (
                <div className="flex gap-4">
                  <FileText className="w-12 h-12 text-muted-foreground" />
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">
                  {isDragActive ? 'Solte o arquivo aqui' : 'Arraste arquivos ou clique para selecionar'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  PDF, XLS ou XLSX (máx. 50MB)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Extractions list */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Uploads</CardTitle>
          <CardDescription>
            Lista de arquivos enviados e seu status de processamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : extractions && extractions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {extractions.map((extraction) => {
                  const statusConfig = STATUS_CONFIG[extraction.status] || STATUS_CONFIG.uploaded;
                  const StatusIcon = statusConfig.icon;
                  const isProcessing = processingId === extraction.id;

                  return (
                    <TableRow key={extraction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {extraction.file_type === 'pdf' ? (
                            <FileText className="w-5 h-5 text-red-500" />
                          ) : (
                            <FileSpreadsheet className="w-5 h-5 text-green-500" />
                          )}
                          <span className="font-medium truncate max-w-[200px]">
                            {extraction.original_filename}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatFileSize(extraction.file_size)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="gap-1">
                          <StatusIcon className={`w-3 h-3 ${extraction.status === 'processing' || isProcessing ? 'animate-spin' : ''}`} />
                          {isProcessing ? 'Processando...' : statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {extraction.total_records > 0 ? (
                          <span className="text-sm">
                            {extraction.reviewed_records}/{extraction.total_records}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(extraction.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {extraction.status === 'uploaded' && (
                            <PermissionGate permission={PERMISSIONS.PROCESS_EXTRACTION}>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProcess(extraction.id)}
                                disabled={isProcessing || processing}
                              >
                                {isProcessing ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                            </PermissionGate>
                          )}
                          {(extraction.status === 'completed' || extraction.status === 'reviewed') && (
                            <PermissionGate permission={PERMISSIONS.REVIEW_EXTRACTION}>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link to={`/review/${extraction.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                            </PermissionGate>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteExtraction(extraction)}
                            disabled={deleting}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum arquivo enviado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Uploads() {
  return (
    <PermissionGate permission={PERMISSIONS.UPLOAD_FILES} showDenied>
      <UploadsContent />
    </PermissionGate>
  );
}
