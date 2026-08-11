import { useGetCaseResult } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Download, AlertCircle, FileText, CheckSquare } from "lucide-react";

export default function CaseResult({ caseId }: { caseId: string }) {
  const { data: result, isLoading } = useGetCaseResult(caseId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card>
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) {
    return (
      <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-10 w-10 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Hasil Belum Tersedia</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Selesaikan seluruh alur kerja terlebih dahulu untuk melihat hasil akhir.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Hasil Akhir & Rekomendasi</h2>
          <p className="text-sm text-slate-500 mt-1">Output konsolidasi dari seluruh proses.</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Unduh Laporan
        </Button>
      </div>

      <Card className="border-emerald-100 shadow-md overflow-hidden relative">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        <CardHeader className="bg-emerald-50/50 pb-4 border-b border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="h-5 w-5" />
            <CardTitle className="text-lg">Ringkasan Eksekutif</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 text-slate-700 leading-relaxed whitespace-pre-wrap">
          {result.summary}
        </CardContent>
      </Card>

      {result.details && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center gap-2 text-slate-800">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Detail Analisis</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
            {result.details}
          </CardContent>
        </Card>
      )}

      {result.recommendations && result.recommendations.length > 0 && (
        <Card className="border-slate-200 shadow-sm bg-slate-50">
          <CardHeader className="pb-3 border-b bg-white">
            <div className="flex items-center gap-2 text-slate-800">
              <CheckSquare className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">Rekomendasi Tindakan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ul className="space-y-3">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex gap-3 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {index + 1}
                  </div>
                  <span className="text-slate-700 mt-0.5">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
