import React, { useState, useEffect } from "react";
import { Member } from "../types";
import { X } from "lucide-react";

interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Member) => Promise<void>;
  initialData?: Member;
}

export default function MemberModal({ isOpen, onClose, onSave, initialData }: MemberModalProps) {
  const defaultMember: Member = {
    nomor_anggota: "",
    nama_lengkap: "",
    jenis_kelamin: "",
    tempat_lahir: "",
    tanggal_lahir: "",
    alamat_asal: "",
    no_telp: "",
    jenis_baptis: "",
    keterangan_baptis: "",
    tanggal_masuk: "",
    tanggal_keluar: "",
    foto_url: "",
    tenantId: "gpstiaa"
  };

  const [formData, setFormData] = useState<Member>(defaultMember);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noUrut, setNoUrut] = useState("");
  const [tahun, setTahun] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.nomor_anggota) {
        const parts = initialData.nomor_anggota.split("/GPSTIAA/");
        if (parts.length === 2) {
          setNoUrut(parts[0]);
          setTahun(parts[1]);
        } else {
          setNoUrut(initialData.nomor_anggota);
          setTahun("");
        }
      }
    } else {
      setFormData(defaultMember);
      setNoUrut("");
      setTahun("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleNomorChange = (newNo: string, newTahun: string) => {
    setNoUrut(newNo);
    setTahun(newTahun);
    if (newNo || newTahun) {
      setFormData(prev => ({ ...prev, nomor_anggota: `${newNo}/GPSTIAA/${newTahun}` }));
    } else {
      setFormData(prev => ({ ...prev, nomor_anggota: "" }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white dark:bg-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {initialData ? "Edit Data" : "Tambah Data"} Jemaat
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="member-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">No. Anggota</label>
                <input
                  type="text"
                  required
                  value={noUrut}
                  onChange={(e) => handleNomorChange(e.target.value, tahun)}
                  placeholder="mis. 1"
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tahun</label>
                <input
                  type="text"
                  required
                  value={tahun}
                  onChange={(e) => handleNomorChange(noUrut, e.target.value)}
                  placeholder="mis. 2016"
                  className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nama Lengkap</label>
              <input
                type="text"
                name="nama_lengkap"
                required
                value={formData.nama_lengkap}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Kelamin</label>
              <select
                name="jenis_kelamin"
                required
                value={formData.jenis_kelamin}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="">Pilih Jenis Kelamin...</option>
                <option value="Pria">Pria</option>
                <option value="Wanita">Wanita</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">No. Telepon / HP</label>
              <input
                type="tel"
                name="no_telp"
                value={formData.no_telp || ""}
                onChange={handleChange}
                placeholder="mis. 081234567890"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tempat Lahir</label>
              <input
                type="text"
                name="tempat_lahir"
                required
                value={formData.tempat_lahir}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Lahir</label>
              <input
                type="date"
                name="tanggal_lahir"
                required
                value={formData.tanggal_lahir}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Alamat Asal</label>
              <textarea
                name="alamat_asal"
                required
                rows={2}
                value={formData.alamat_asal}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Jenis Baptis</label>
              <select
                name="jenis_baptis"
                value={formData.jenis_baptis}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="">Belum / Pilih Jenis...</option>
                <option value="Baptis Kecil">Baptis Kecil</option>
                <option value="SIDI">SIDI</option>
                <option value="Baptis Dewasa">Baptis Dewasa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Keterangan Baptis</label>
              <input
                type="text"
                name="keterangan_baptis"
                value={formData.keterangan_baptis}
                onChange={handleChange}
                placeholder="Diisi manual untuk keterangan tambahan"
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Masuk</label>
              <input
                type="date"
                name="tanggal_masuk"
                value={formData.tanggal_masuk}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tanggal Keluar (Opsional)</label>
              <input
                type="date"
                name="tanggal_keluar"
                value={formData.tanggal_keluar}
                onChange={handleChange}
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Link Foto (Google Drive dll)</label>
              <input
                type="url"
                name="foto_url"
                value={formData.foto_url}
                onChange={handleChange}
                placeholder="https://drive.google.com/..."
                className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Batal
          </button>
          <button
            type="submit"
            form="member-form"
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
