import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { Plus, Edit2, Trash2, ExternalLink, FileText, DollarSign, Users } from "lucide-react";
import { db } from "../lib/firebase";
import { MisiRepo } from "../types";
import MonthYearInputMask from "./MonthYearInputMask";
import { parseMonthYearInput, toIndonesianMonthYearInput } from "../lib/utils";
import MisiKaltaraFinancePanel from "./MisiKaltaraFinancePanel";
import MisiKaltaraMembersPanel from "./MisiKaltaraMembersPanel";

export default function MisiKaltaraPanel() {
  const [activeTab, setActiveTab] = useState<"dokumentasi" | "keuangan" | "jemaat">("dokumentasi");

  const [items, setItems] = useState<MisiRepo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MisiRepo | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [yearFilter, setYearFilter] = useState("Semua");
  const [formBulan, setFormBulan] = useState("");

  const openModal = (item?: MisiRepo) => {
    setSelectedItem(item);
    setFormBulan(item?.bulan || "");
    setIsModalOpen(true);
  };

  useEffect(() => {
    const q = query(
      collection(db, "misi_repo"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("bulan", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: MisiRepo[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as MisiRepo);
      });
      setItems(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      bulan: parseMonthYearInput(formBulan),
      driveLink: formData.get("driveLink") as string,
      description: formData.get("description") as string,
      tenantId: "gpstiaa",
    };

    if (selectedItem?.id) {
      await setDoc(doc(db, "misi_repo", selectedItem.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(doc(collection(db, "misi_repo")), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteDoc(doc(db, "misi_repo", itemToDelete));
      setItemToDelete(null);
    }
  };

  // Derive unique years for filter
  const uniqueYears = Array.from(new Set(items.map(item => {
    const parts = item.bulan.split('-');
    return parts.length === 2 ? parts[0] : '';
  }).filter(Boolean))).sort().reverse();

  const filteredItems = items.filter(item => {
    if (yearFilter !== "Semua") {
      const year = item.bulan.split('-')[0];
      if (year !== yearFilter) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Misi Kaltara</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Laporan Dokumentasi dan Keuangan Cabang Misi Kaltara</p>
        
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveTab("dokumentasi")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "dokumentasi"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <FileText className="w-4 h-4" /> Dokumentasi
          </button>
          <button
            onClick={() => setActiveTab("keuangan")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "keuangan"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <DollarSign className="w-4 h-4" /> Keuangan
          </button>
          <button
            onClick={() => setActiveTab("jemaat")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === "jemaat"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
          >
            <Users className="w-4 h-4" /> Data Jemaat
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-4">
        {activeTab === "keuangan" ? (
          <MisiKaltaraFinancePanel />
        ) : activeTab === "jemaat" ? (
          <MisiKaltaraMembersPanel />
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
             <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center justify-between">
                <select
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  <option value="Semua">Semua Tahun</option>
                  {uniqueYears.map((yr, idx) => (
                    <option key={idx} value={yr}>{yr}</option>
                  ))}
                </select>
                <button
                  onClick={() => openModal()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Tambah Misi
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-xl">
                {isLoading ? (
                  <p className="text-center p-4">Memuat data...</p>
                ) : filteredItems.length === 0 ? (
                  <p className="text-center p-4 text-slate-500">Belum ada dokumentasi Misi Kaltara.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map(item => (
                      <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 break-words">{item.title}</h3>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(item)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => setItemToDelete(item.id!)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 mt-2">Bulan: {toIndonesianMonthYearInput(item.bulan)}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">{item.description || "Tidak ada deskripsi"}</p>
                        <a href={item.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                          <ExternalLink className="w-3.5 h-3.5" /> Buka Dokumentasi
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        )}
      </div>

      {isModalOpen && activeTab === "dokumentasi" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">{selectedItem ? "Edit" : "Tambah"} Dokumentasi Misi</h3>
            <form onSubmit={handleSave} className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
              <div>
                <label className="block mb-1 font-medium">Judul/Kegiatan Misi</label>
                <input required name="title" defaultValue={selectedItem?.title} placeholder="mis. Kunjungan Pos PI" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block mb-1 font-medium">Bulan</label>
                  <MonthYearInputMask required name="bulan" value={formBulan} onChange={(e) => setFormBulan(e.target.value)} className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Link Google Drive</label>
                <input required type="url" name="driveLink" defaultValue={selectedItem?.driveLink} placeholder="https://drive.google.com/..." className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div>
                <label className="block mb-1 font-medium">Deskripsi Kegiatan</label>
                <textarea name="description" defaultValue={selectedItem?.description} placeholder="Opsional" rows={3} className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && activeTab === "dokumentasi" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Hapus Data?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Dokumentasi ini akan dihapus secara permanen.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setItemToDelete(null)} className="px-4 py-2 border rounded-lg dark:border-slate-600">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
