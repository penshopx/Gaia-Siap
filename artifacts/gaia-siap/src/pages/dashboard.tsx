import { useGetDashboardSummary, useListCases } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { FileText, ArrowRight, BarChart3, Clock, CheckCircle2, PlayCircle, FileEdit } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: recentCases, isLoading: isLoadingCases } = useListCases({ limit: 5 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="draft">Draf</Badge>;
      case "intake": return <Badge variant="intake">Masukan</Badge>;
      case "processing": return <Badge variant="processing">Diproses</Badge>;
      case "review": return <Badge variant="review">Reviu</Badge>;
      case "completed": return <Badge variant="completed">Selesai</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string | undefined | null) => {
    switch (priority) {
      case "low": return <Badge variant="priority_low">Rendah</Badge>;
      case "normal": return <Badge variant="priority_normal">Normal</Badge>;
      case "high": return <Badge variant="priority_high">Tinggi</Badge>;
      default: return null;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dasbor Organisasi</h1>
        <p className="text-slate-500 mt-1">Ringkasan aktivitas dan kasus yang sedang berjalan.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Kasus</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-slate-900">{summary?.totalCases || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Perlu Masukan</CardTitle>
            <FileEdit className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-blue-700">{summary?.byStatus?.intake || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Sedang Diproses</CardTitle>
            <PlayCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-amber-700">{summary?.byStatus?.processing || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Selesai</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-emerald-700">{summary?.byStatus?.completed || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Kasus Terbaru</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/cases">Lihat Semua</Link>
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          {isLoadingCases ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : recentCases?.items && recentCases.items.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentCases.items.map((c) => (
                <div 
                  key={c.id} 
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                  onClick={() => setLocation(`/case/${c.id}`)}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.title}</span>
                      {getStatusBadge(c.status)}
                      {getPriorityBadge(c.priority)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><FileText size={14} /> {c.id.substring(0, 8)}</span>
                      {c.category && <span>{c.category}</span>}
                      <span className="flex items-center gap-1"><Clock size={14} /> Diperbarui {formatDate(c.updatedAt)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                <FileText size={24} />
              </div>
              <h3 className="text-base font-medium text-slate-900 mb-1">Belum ada kasus</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">Mulai kasus baru untuk mendokumentasikan dan memproses masalah.</p>
              <Button asChild>
                <Link href="/mulai">Buat Kasus</Link>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
