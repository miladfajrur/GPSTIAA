import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { WeeklyReport } from "../types";

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: WeeklyReport;
  onSave: (data: Partial<WeeklyReport>) => Promise<void>;
}

export default function WeeklyReportModal({ isOpen, onClose, initialData, onSave }: WeeklyReportModalProps) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Error saving report: ", error);
      alert("Gagal menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
      <div className="flex w-full max-w-4xl flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl relative my-auto">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {initialData ? "Edit Laporan" : "Tambah Laporan"} Mingguan
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 max-h-[75vh]">
          <form id="report-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Ibadah</label>
                <input
                  type="date"
                  name="tanggal_ibadah"
                  required
                  value={formData.tanggal_ibadah}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Ibadah</label>
                <input
                  type="text"
                  name="nama_ibadah"
                  required
                  value={formData.nama_ibadah}
                  onChange={handleChange}
                  placeholder="mis. Ibadah Raya Minggu, Ibadah Pemuda"
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Data Kehadiran</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hadir Dewasa / Umum</label>
                  <input
                    type="number"
                    name="kehadiran_dewasa"
                    min="0"
                    required
                    value={formData.kehadiran_dewasa}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hadir Pemuda / Remaja</label>
                  <input
                    type="number"
                    name="kehadiran_pemuda"
                    min="0"
                    required
                    value={formData.kehadiran_pemuda}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Hadir Anak (Sekolah Minggu)</label>
                  <input
                    type="number"
                    name="kehadiran_anak"
                    min="0"
                    required
                    value={formData.kehadiran_anak}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Laporan Keuangan (Rp)</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Persembahan Umum</label>
                  <input
                    type="number"
                    name="persembahan_umum"
                    min="0"
                    required
                    value={formData.persembahan_umum}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Perpuluhan</label>
                  <input
                    type="number"
                    name="perpuluhan"
                    min="0"
                    required
                    value={formData.perpuluhan}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Pemasukan Diakonia</label>
                  <input
                    type="number"
                    name="diakonia"
                    min="0"
                    required
                    value={formData.diakonia}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Pemasukan Lainnya</label>
                  <input
                    type="number"
                    name="pemasukan_lainnya"
                    min="0"
                    required
                    value={formData.pemasukan_lainnya}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Keterangan Tambahan / Laporan Lain</label>
              <textarea
                name="keterangan"
                rows={3}
                value={formData.keterangan}
                onChange={handleChange}
                placeholder="Catatan tambahan, pembicara, ringkasan, dll."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Batal
          </button>
          <button
            type="submit"
            form="report-form"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Menyimpan..." : "Simpan Data"}
          </button>
        </div>
      </div>
    </div>
  );
}
