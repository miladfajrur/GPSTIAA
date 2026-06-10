import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { Plus, Edit2, Trash2, ExternalLink, FileText } from "lucide-react";
import { db } from "../lib/firebase";
import { DocumentItem } from "../types";
import DateInputMask from "./DateInputMask";
import { formatDateDDMMYYYY } from "../lib/utils";

export default function DocumentPanel() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DocumentItem | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [yearFilter, setYearFilter] = useState("Semua");
  const [formDate, setFormDate] = useState("");

  const openModal = (item?: DocumentItem) => {
    setSelectedItem(item);
    setFormDate(item?.date || new Date().toISOString().split("T")[0]);
    setIsModalOpen(true);
  };


  useEffect(() => {
    const q = query(
      collection(db, "documents"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: DocumentItem[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as DocumentItem);
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
      letterNumber: (formData.get("letterNumber") as string) || "",
      sourceOrDest: (formData.get("sourceOrDest") as string) || "",
      category: formData.get("category") as "Masuk" | "Keluar",
      date: formDate,
      driveLink: formData.get("driveLink") as string,
      description: formData.get("description") as string,
      tenantId: "gpstiaa",
    };

    if (selectedItem?.id) {
      await setDoc(doc(db, "documents", selectedItem.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(doc(collection(db, "documents")), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteDoc(doc(db, "documents", itemToDelete));
      setItemToDelete(null);
    }
  };

  const uniqueYears = Array.from(new Set(items.map(item => {
    const parts = item.date.split('-');
    return parts.length === 3 ? parts[0] : '';
  }).filter(Boolean))).sort().reverse();

  const filteredItems = items.filter(i => {
    if (categoryFilter !== "Semua" && i.category !== categoryFilter) return false;
    if (yearFilter !== "Semua") {
      const year = i.date.split('-')[0];
      if (year !== yearFilter) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Arsip Dokumen Surat</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Penyimpanan dokumen/surat Masuk dan Keluar</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-sm border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
          >
            <option value="Semua">Semua Kategori</option>
            <option value="Masuk">Surat Masuk</option>
            <option value="Keluar">Surat Keluar</option>
          </select>
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(e.target.value)}
            className="text-sm border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900"
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
            <Plus className="w-4 h-4" /> Tambah Surat
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <p className="text-center p-4">Memuat data...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center p-4 text-slate-500">Belum ada dokumen.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-start gap-2">
                    <FileText className={`w-5 h-5 shrink-0 mt-0.5 ${item.category === 'Masuk' ? 'text-emerald-500' : 'text-amber-500'}`} />
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 break-words line-clamp-2">{item.title}</h3>
                      <div className="flex gap-2 items-center mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${item.category === 'Masuk' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{item.category}</span>
                        {item.letterNumber && <span className="text-[10px] font-mono bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">{item.letterNumber}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModal(item)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setItemToDelete(item.id!)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-1 mb-3">
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Tgl: {formatDateDDMMYYYY(item.date)}</p>
                  {item.sourceOrDest && <p className="text-xs text-slate-500 dark:text-slate-400"><span className="font-semibold">{item.category === 'Masuk' ? 'Dari:' : 'Ke:'}</span> {item.sourceOrDest}</p>}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-4">{item.description || "Tidak ada keterangan"}</p>
                <a href={item.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800">
                  <ExternalLink className="w-3.5 h-3.5" /> Buka Dokumen
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">{selectedItem ? "Edit" : "Tambah"} Arsip Surat</h3>
            <form onSubmit={handleSave} className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
              <div>
                <label className="block mb-1 font-medium">Perihal Surat</label>
                <input required name="title" defaultValue={selectedItem?.title} placeholder="mis. Undangan Rapat Majelis" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Nomor Surat <span className="text-slate-400 font-normal">(Opsional)</span></label>
                  <input name="letterNumber" defaultValue={selectedItem?.letterNumber} placeholder="01/SURAT/..." className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Kategori</label>
                  <select required name="category" defaultValue={selectedItem?.category || "Masuk"} className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900">
                    <option value="Masuk">Masuk</option>
                    <option value="Keluar">Keluar</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Asal / Tujuan Surat <span className="text-slate-400 font-normal">(Opsional)</span></label>
                <input name="sourceOrDest" defaultValue={selectedItem?.sourceOrDest} placeholder="mis. Sinode Wilayah / Majelis Jemaat" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block mb-1 font-medium">Tanggal Surat</label>
                  <DateInputMask required name="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} placeholder="DD/MM/YYYY" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Link Dokumen (G-Drive / PDF)</label>
                <input required type="url" name="driveLink" defaultValue={selectedItem?.driveLink} placeholder="https://drive.google.com/..." className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div>
                <label className="block mb-1 font-medium">Keterangan Tambahan</label>
                <textarea name="description" defaultValue={selectedItem?.description} placeholder="Opsional" rows={2} className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-lg dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">Batal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Hapus Arsip?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Dokumen ini akan dihapus dari sistem.</p>
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
