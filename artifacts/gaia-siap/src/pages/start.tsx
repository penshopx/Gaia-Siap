import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Briefcase, ArrowLeft } from "lucide-react";

import { useCreateCase } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// The scaffold lacks Select, we'll build a simple native select or standard HTML select with tailwind classes for this form
const formSchema = z.object({
  title: z.string().min(3, "Judul kasus minimal 3 karakter"),
  category: z.string().min(1, "Kategori wajib diisi"),
  priority: z.enum(["low", "normal", "high"], { required_error: "Pilih prioritas" }),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function Start() {
  const [, setLocation] = useLocation();
  const createCase = useCreateCase();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "",
      priority: "normal",
      description: "",
    },
  });

  function onSubmit(values: FormValues) {
    createCase.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          // On success, redirect to the new case
          setLocation(`/case/${data.id}`);
        },
      }
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            className="mb-4 text-slate-500 hover:text-slate-900 -ml-4"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <Briefcase size={22} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Buat Kasus Baru</h1>
          </div>
          <p className="text-slate-600 text-sm">Masukan detail awal untuk memulai alur penyelesaian masalah.</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="pt-6 space-y-5">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Judul Kasus</FormLabel>
                      <FormControl>
                        <Input placeholder="Mis. Audit Keuangan Q3" className="bg-slate-50" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Kategori</FormLabel>
                        <FormControl>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                            {...field}
                          >
                            <option value="" disabled>Pilih Kategori</option>
                            <option value="Finance">Keuangan</option>
                            <option value="Operations">Operasional</option>
                            <option value="Legal">Legal & Kepatuhan</option>
                            <option value="HR">Sumber Daya Manusia</option>
                            <option value="IT">Teknologi Informasi</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700">Prioritas</FormLabel>
                        <FormControl>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            {...field}
                          >
                            <option value="low">Rendah</option>
                            <option value="normal">Normal</option>
                            <option value="high">Tinggi</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700">Deskripsi Singkat</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Jelaskan konteks masalah secara singkat..." 
                          className="resize-none bg-slate-50 h-24"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="bg-slate-50 rounded-b-xl px-6 py-4 border-t flex justify-end">
                <Button 
                  type="submit" 
                  disabled={createCase.isPending}
                  className="w-full sm:w-auto font-medium"
                >
                  {createCase.isPending ? "Menyimpan..." : "Buat & Lanjutkan"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
