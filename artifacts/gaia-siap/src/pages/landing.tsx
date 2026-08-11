import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Briefcase size={22} />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Gaia SIAP</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:inline-flex text-slate-600 font-medium">
            <Link href="/sign-in">Masuk</Link>
          </Button>
          <Button asChild className="rounded-full shadow-sm px-6">
            <Link href="/sign-up">Mulai Sekarang</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="px-6 lg:px-12 pt-20 pb-32 max-w-5xl mx-auto w-full">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
              Sistem Orchestrasi Bisnis B2B
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1]">
              Ubah masalah kompleks menjadi <span className="text-primary">tindakan terstruktur.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
              Ruang kerja yang tenang dan terarah. Tempat Anda memproses masukan, menjalankan alur kerja, dan memberikan hasil yang tajam layaknya konsultan berpengalaman.
            </p>
            <div className="pt-4 flex items-center gap-4">
              <Button asChild size="lg" className="rounded-full shadow-md text-base px-8 h-14">
                <Link href="/sign-up">
                  Mulai Kasus Baru <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Workflow Explanation */}
        <section className="bg-white border-t border-slate-200 py-24 px-6 lg:px-12">
          <div className="max-w-5xl mx-auto w-full">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-4">Cara Kerja Gaia SIAP</h2>
              <p className="text-slate-600 max-w-xl mx-auto">Kami merancang alur yang logis dan efisien untuk memastikan setiap kasus tertangani dengan standar profesional.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting line for desktop */}
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-[2px] bg-slate-100 z-0"></div>
              
              <div className="relative z-10 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6 ring-8 ring-white">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">1. Masukan (Intake)</h3>
                <p className="text-sm text-slate-600">Kumpulkan data, konteks, dan inti permasalahan secara terstruktur sebelum proses dimulai.</p>
              </div>

              <div className="relative z-10 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 mb-6 ring-8 ring-white">
                  <Clock size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">2. Alur Kerja (Workflow)</h3>
                <p className="text-sm text-slate-600">Jalankan proses langkah demi langkah yang jelas. Lacak kemajuan tanpa menebak-nebak.</p>
              </div>

              <div className="relative z-10 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 ring-8 ring-white">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">3. Hasil (Result)</h3>
                <p className="text-sm text-slate-600">Dapatkan output akhir dan rekomendasi yang terukur. Siap untuk dieksekusi.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
