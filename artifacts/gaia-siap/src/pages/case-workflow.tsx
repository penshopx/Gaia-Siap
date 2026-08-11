import { useGetCaseWorkflow, useAdvanceCaseWorkflow, useUpdateCase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle, Clock, ArrowRight, Play, AlertCircle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCaseWorkflowQueryKey, getGetCaseQueryKey } from "@workspace/api-client-react";

export default function CaseWorkflow({ caseId }: { caseId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: workflow, isLoading } = useGetCaseWorkflow(caseId);
  
  const advanceWorkflow = useAdvanceCaseWorkflow();
  const updateCase = useUpdateCase();

  const handleAdvance = () => {
    advanceWorkflow.mutate({ id: caseId, data: { notes: "Dilanjutkan manual via UI" } }, {
      onSuccess: (data) => {
        toast({
          title: "Tahap Dilanjutkan",
          description: "Alur kerja berhasil beralih ke tahap berikutnya."
        });
        queryClient.invalidateQueries({ queryKey: getGetCaseWorkflowQueryKey(caseId) });
        
        // If workflow is done, update case status to review or completed
        const allDone = data.steps.every(s => s.status === 'completed');
        if (allDone) {
          updateCase.mutate({ id: caseId, data: { status: "review" } }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) })
          });
        }
      },
      onError: () => {
        toast({
          title: "Gagal memproses",
          description: "Terjadi kesalahan saat memajukan alur kerja.",
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!workflow || workflow.steps.length === 0) {
    return (
      <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="h-10 w-10 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">Alur Kerja Belum Dibuat</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">
            Alur kerja belum tersedia untuk kasus ini. Lengkapi Data Masukan (Intake) terlebih dahulu.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isAllCompleted = workflow.steps.every(s => s.status === 'completed');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Orkestrasi Alur Kerja</h2>
          <p className="text-sm text-slate-500 mt-1">Lacak dan jalankan tahapan proses penanganan.</p>
        </div>
        {!isAllCompleted && (
          <Button onClick={handleAdvance} disabled={advanceWorkflow.isPending}>
            <Play className="mr-2 h-4 w-4" /> 
            {advanceWorkflow.isPending ? "Memproses..." : "Lanjutkan Tahap"}
          </Button>
        )}
      </div>

      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[27px] top-[30px] bottom-10 w-[2px] bg-slate-100 z-0"></div>

        <div className="space-y-6 relative z-10">
          {workflow.steps.map((step, index) => {
            const isActive = step.status === 'active';
            const isCompleted = step.status === 'completed';
            const isPending = step.status === 'pending';

            return (
              <div 
                key={step.id} 
                className={cn(
                  "flex gap-6 transition-all duration-300",
                  isPending && "opacity-60"
                )}
              >
                {/* Step Indicator */}
                <div className="flex flex-col items-center pt-1">
                  <div className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full border-4 shrink-0 transition-colors",
                    isCompleted ? "border-emerald-100 bg-emerald-500 text-white" :
                    isActive ? "border-blue-100 bg-blue-600 text-white shadow-md shadow-blue-200" :
                    "border-slate-100 bg-white text-slate-400"
                  )}>
                    {isCompleted ? <CheckCircle2 size={24} /> : 
                     isActive ? <ArrowRight size={24} className="animate-pulse" /> : 
                     <span className="text-lg font-bold">{step.stepNumber}</span>}
                  </div>
                </div>

                {/* Step Content */}
                <Card className={cn(
                  "flex-1 border-slate-200 shadow-sm transition-all",
                  isActive && "border-blue-200 shadow-md ring-1 ring-blue-100"
                )}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={cn(
                            "text-lg font-bold tracking-tight",
                            isActive ? "text-blue-900" : "text-slate-900"
                          )}>
                            {step.title}
                          </h3>
                          {isActive && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">Aktif</Badge>}
                          {isCompleted && <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Selesai</Badge>}
                        </div>
                        {step.description && (
                          <p className="text-slate-600 text-sm mt-2">{step.description}</p>
                        )}
                      </div>
                      
                      {step.completedAt && (
                        <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md shrink-0">
                          <Clock size={12} className="mr-1" />
                          Selesai pada {formatDate(step.completedAt)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
