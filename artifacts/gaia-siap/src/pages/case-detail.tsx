import { useLocation, Link, Route, Switch } from "wouter";
import { useGetCase } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ListChecks, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import CaseIntake from "./case-intake";
import CaseWorkflow from "./case-workflow";
import CaseResult from "./case-result";

export default function CaseDetail({ params }: { params: { id: string } }) {
  const [location, setLocation] = useLocation();
  const id = params.id;
  
  const { data: caseData, isLoading, error } = useGetCase(id);

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

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-32 w-full mt-8" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-medium text-slate-900">Kasus Tidak Ditemukan</h2>
        <p className="text-slate-500 mt-1">Kasus mungkin telah dihapus atau ID tidak valid.</p>
        <Link href="/dashboard" className="mt-4 text-primary font-medium hover:underline">Kembali ke Dasbor</Link>
      </div>
    );
  }

  const tabs = [
    { id: "intake", label: "Data Masukan", icon: FileText, path: `/case/${id}/intake` },
    { id: "workflow", label: "Alur Kerja", icon: ListChecks, path: `/case/${id}/workflow` },
    { id: "result", label: "Hasil", icon: CheckCircle2, path: `/case/${id}/result` },
  ];

  // Determine active tab based on current path, default to intake if exact match on /case/:id
  const activeTab = tabs.find(t => location.startsWith(t.path))?.id || "intake";

  // Redirect to intake if exactly on base route
  if (location === `/case/${id}` || location === `/case/${id}/`) {
    setLocation(`/case/${id}/intake`, { replace: true });
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Case Header */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-8 pt-8 pb-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center text-sm font-medium text-slate-500 mb-4">
            <Link href="/dashboard" className="hover:text-slate-900 transition-colors">Dasbor</Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-slate-900 truncate">Kasus {caseData.id.substring(0, 8)}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                {caseData.title}
              </h1>
              {caseData.description && (
                <p className="text-slate-600 mt-2 max-w-2xl">{caseData.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {getStatusBadge(caseData.status)}
              {caseData.priority === "high" && <Badge variant="priority_high">Prioritas Tinggi</Badge>}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-500 mb-8 border-t border-slate-100 pt-4">
            <div><span className="font-medium text-slate-700">Kategori:</span> {caseData.category || "-"}</div>
            <div><span className="font-medium text-slate-700">Dibuat:</span> {formatDate(caseData.createdAt)}</div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={tab.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                    isActive 
                      ? "border-primary text-primary" 
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-5xl mx-auto h-full">
          <Switch>
            <Route path="/case/:id/intake" component={() => <CaseIntake caseId={id} />} />
            <Route path="/case/:id/workflow" component={() => <CaseWorkflow caseId={id} />} />
            <Route path="/case/:id/result" component={() => <CaseResult caseId={id} />} />
          </Switch>
        </div>
      </div>
    </div>
  );
}
