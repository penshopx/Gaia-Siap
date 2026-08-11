import { useState, useEffect } from "react";
import { useGetCaseIntake, useSubmitCaseIntake, useUpdateCase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCaseQueryKey, getGetCaseIntakeQueryKey } from "@workspace/api-client-react";

export default function CaseIntake({ caseId }: { caseId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: intake, isLoading } = useGetCaseIntake(caseId);
  
  const submitIntake = useSubmitCaseIntake();
  const updateCase = useUpdateCase();

  const [fields, setFields] = useState<{key: string, label: string, value: string}[]>([]);
  const [notes, setNotes] = useState("");

  // Sync data to local state once loaded
  useEffect(() => {
    if (intake) {
      if (intake.fields && intake.fields.length > 0) {
        setFields(intake.fields);
      } else {
        // Initial empty fields if none
        setFields([
          { key: "latar_belakang", label: "Latar Belakang Masalah", value: "" },
          { key: "dampak", label: "Dampak terhadap Bisnis", value: "" }
        ]);
      }
      setNotes(intake.notes || "");
    } else if (!isLoading) {
      setFields([
        { key: "latar_belakang", label: "Latar Belakang Masalah", value: "" },
        { key: "dampak", label: "Dampak terhadap Bisnis", value: "" }
      ]);
    }
  }, [intake, isLoading]);

  const handleFieldChange = (index: number, value: string) => {
    const newFields = [...fields];
    newFields[index].value = value;
    setFields(newFields);
  };

  const addField = () => {
    setFields([...fields, { key: `field_${Date.now()}`, label: "Field Baru", value: "" }]);
  };

  const removeField = (index: number) => {
    const newFields = [...fields];
    newFields.splice(index, 1);
    setFields(newFields);
  };

  const handleSave = () => {
    submitIntake.mutate(
      { id: caseId, data: { fields, notes } },
      {
        onSuccess: () => {
          toast({
            title: "Tersimpan",
            description: "Data masukan berhasil disimpan.",
          });
          queryClient.invalidateQueries({ queryKey: getGetCaseIntakeQueryKey(caseId) });
          
          // Also update status to 'processing' if we are moving forward
          updateCase.mutate({ id: caseId, data: { status: "processing" } }, {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
            }
          });
        },
        onError: () => {
          toast({
            title: "Gagal menyimpan",
            description: "Terjadi kesalahan saat menyimpan data.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4 mb-2" />
          <Skeleton className="h-4 w-2/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="text-primary" /> Pengumpulan Data
          </h2>
          <p className="text-sm text-slate-500 mt-1">Lengkapi informasi dasar sebelum memulai alur kerja.</p>
        </div>
        <Button onClick={handleSave} disabled={submitIntake.isPending}>
          <Save className="mr-2 h-4 w-4" /> 
          {submitIntake.isPending ? "Menyimpan..." : "Simpan Data"}
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Formulir Masukan</CardTitle>
          <CardDescription>Isi detail yang relevan dengan kasus ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field, index) => (
            <div key={index} className="space-y-2 relative group">
              <div className="flex items-center justify-between">
                <Input 
                  value={field.label} 
                  onChange={(e) => {
                    const newFields = [...fields];
                    newFields[index].label = e.target.value;
                    setFields(newFields);
                  }}
                  className="font-medium text-sm text-slate-700 bg-transparent border-transparent px-0 hover:border-input focus:border-input focus:bg-background h-8 w-auto min-w-[200px]"
                />
                {fields.length > 1 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeField(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Textarea 
                value={field.value}
                onChange={(e) => handleFieldChange(index, e.target.value)}
                placeholder="Masukkan jawaban..."
                className="bg-slate-50 min-h-[100px]"
              />
            </div>
          ))}
          
          <Button variant="outline" size="sm" onClick={addField} className="text-slate-600 border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Tambah Kolom
          </Button>

          <div className="pt-6 border-t mt-6">
            <Label className="text-base font-semibold mb-2 block">Catatan Tambahan (Internal)</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan konsultan, referensi dokumen..."
              className="bg-slate-50"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
