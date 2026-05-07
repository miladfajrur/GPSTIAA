import React, { useState, useEffect } from "react";
import { X, Calendar, FileText, Users, Download, ArrowUpRight, ArrowDownRight, Edit3 } from "lucide-react";
import { WeeklyReport } from "../types";
import DateInputMask from "./DateInputMask";
import { useToast } from "../ToastContext";

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WeeklyReport;
  onSave: (data: Partial<WeeklyReport>) => Promise<void>;
}

const formatRupiah = (value: number | string) => {
  const numberString = value.toString().replace(/[^,\d]/g, '');
  if (!numberString) return '';
  return new Intl.NumberFormat('id-ID').format(Number(numberString));
};

const parseRupiah = (value: string) => {
  const numberString = value.replace(/[^,\d]/g, '');
  return numberString ? Number(numberString) : 0;
};

export default function WeeklyReportModal({ isOpen, onClose, initialData, onSave }: WeeklyReportModalProps) {
  const { addToast } = useToast();
  const [formData, setFormData] = useState<Partial<WeeklyReport>>({
    tanggal_ibadah: "",
    nama_ibadah: "",
    kehadiran_dewasa: 0,
    kehadiran_pemuda: 0,
    kehadiran_anak: 0,
    persembahan_umum: 0,
    perpuluhan: 0,
    diakonia: 0,
    pemasukan_lainnya: 0,
    keterangan: "",
    tenantId: "gpstiaa"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        tanggal_ibadah: new Date().toISOString().split('T')[0],
        nama_ibadah: "",
        kehadiran_dewasa: 0,
        kehadiran_pemuda: 0,
        kehadiran_anak: 0,
        persembahan_umum: 0,
        perpuluhan: 0,
        diakonia: 0,
        pemasukan_lainnya: 0,
        keterangan: "",
        tenantId: "gpstiaa"
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleRupiahChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseRupiah(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving report: ", error);
      addToast("Gagal menyimpan data.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl bg-slate-50 dark:bg-slate-900 shadow-2xl relative my-auto border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
             <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
             {initialData ? "Edit Laporan Mingguan" : "Tambah Laporan Mingguan"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-h-[75vh]">
          <form id="report-form" onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* Informasi Ibadah */}
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                    <Calendar className="w-4 h-4 text-blue-500" /> Informasi Jadwal
                  </h3>
                  <div className="space-y-4 mt-2">
                     <div>
                       <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Tanggal Ibadah</label>
                       <DateInputMask
                         name="tanggal_ibadah"
                         required
                         value={formData.tanggal_ibadah || ""}
                         onChange={handleChange}
                         placeholder="DD-MM-YYYY"
                         className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner"
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Nama / Jenis Ibadah</label>
                       <input
                         type="text"
                         name="nama_ibadah"
                         required
                         value={formData.nama_ibadah}
                         onChange={handleChange}
                         placeholder="mis. Ibadah Raya Minggu, Ibadah Pemuda"
                         className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all shadow-inner"
                       />
                     </div>
                  </div>
               </div>

               {/* Kehadiran */}
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                    <Users className="w-4 h-4 text-indigo-500" /> Statistik Kehadiran
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                     <div>
                       <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 capitalize">Umum / Dewasa</label>
                       <input
                         type="number"
                         name="kehadiran_dewasa"
                         min="0"
                         required
                         value={formData.kehadiran_dewasa || ''}
                         onChange={handleChange}
                         className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                       />
                     </div>
                     <div>
                       <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 capitalize">Pemuda</label>
                       <input
                         type="number"
                         name="kehadiran_pemuda"
                         min="0"
                         required
                         value={formData.kehadiran_pemuda || ''}
                         onChange={handleChange}
                         className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                       />
                     </div>
                     <div className="col-span-2 sm:col-span-1">
                       <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 capitalize">Anak</label>
                       <input
                         type="number"
                         name="kehadiran_anak"
                         min="0"
                         required
                         value={formData.kehadiran_anak || ''}
                         onChange={handleChange}
                         className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all shadow-inner"
                       />
                     </div>
                  </div>
               </div>
            </div>

            {/* Pemasukan */}
            <div className="bg-emerald-50/30 dark:bg-emerald-900/10 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-800/30 p-5 space-y-4">
               <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-2 border-b border-emerald-200/50 dark:border-emerald-800/50 pb-3">
                 <ArrowUpRight className="w-5 h-5" /> Data Pemasukan (Rp)
               </h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                 <div>
                   <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">Persembahan Umum</label>
                   <div className="relative rounded-md shadow-sm">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                       <span className="text-emerald-600 dark:text-emerald-500 font-medium sm:text-sm">Rp</span>
                     </div>
                     <input
                       type="text"
                       name="persembahan_umum"
                       required
                       value={formatRupiah(formData.persembahan_umum || 0)}
                       onChange={handleRupiahChange}
                       className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                     />
                   </div>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">Perpuluhan / Persembahan Khusus</label>
                   <div className="relative rounded-md shadow-sm">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                       <span className="text-emerald-600 dark:text-emerald-500 font-medium sm:text-sm">Rp</span>
                     </div>
                     <input
                       type="text"
                       name="perpuluhan"
                       required
                       value={formatRupiah(formData.perpuluhan || 0)}
                       onChange={handleRupiahChange}
                       className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                     />
                   </div>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">Diakonia</label>
                   <div className="relative rounded-md shadow-sm">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                       <span className="text-emerald-600 dark:text-emerald-500 font-medium sm:text-sm">Rp</span>
                     </div>
                     <input
                       type="text"
                       name="diakonia"
                       required
                       value={formatRupiah(formData.diakonia || 0)}
                       onChange={handleRupiahChange}
                       className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                     />
                   </div>
                 </div>
                 <div>
                   <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">Pemasukan Lainnya</label>
                   <div className="relative rounded-md shadow-sm">
                     <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                       <span className="text-emerald-600 dark:text-emerald-500 font-medium sm:text-sm">Rp</span>
                     </div>
                     <input
                       type="text"
                       name="pemasukan_lainnya"
                       required
                       value={formatRupiah(formData.pemasukan_lainnya || 0)}
                       onChange={handleRupiahChange}
                       className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800/50 pl-10 pr-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                     />
                   </div>
                 </div>
               </div>
            </div>

            {/* Catatan Lainnya */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-4">
               <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                 <Edit3 className="w-4 h-4 text-amber-500" /> Catatan Tambahan (Bila Ada)
               </h3>
               <div className="mt-2">
                 <textarea
                   name="keterangan"
                   rows={3}
                   value={formData.keterangan || ''}
                   onChange={handleChange}
                   placeholder="Tuliskan catatan tambahan, nama pengkhotbah, kesaksian, atau rincian lainnya..."
                   className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all shadow-inner placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                 />
               </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
          >
            Batal
          </button>
          <button
            type="submit"
            form="report-form"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
          >
            {isSubmitting ? (
               <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Menyimpan...</>
            ) : "Simpan Laporan"}
          </button>
        </div>
      </div>
    </div>
  );
}
