import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where, writeBatch } from "firebase/firestore";
import { Plus, Edit2, Trash2, Download, Upload, Copy } from "lucide-react";
import { db } from "../lib/firebase";
import { WorshipTheme } from "../types";
import DateInputMask from "./DateInputMask";
import { formatDateDDMMYYYY } from "../lib/utils";
import BulkThemeModal from "./BulkThemeModal";
import { useToast } from "../ToastContext";

export default function WorshipThemePanel() {
  const { addToast } = useToast();
  const [items, setItems] = useState<WorshipTheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WorshipTheme | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [formDate, setFormDate] = useState("");
  const [yearFilter, setYearFilter] = useState("Semua");
  const [sortBy, setSortBy] = useState("date_desc");
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const openModal = (item?: WorshipTheme) => {
    setSelectedItem(item);
    setFormDate(item?.date || new Date().toISOString().split("T")[0]);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const q = query(
      collection(db, "worship_themes"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: WorshipTheme[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as WorshipTheme);
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
      type: formData.get("type") as "Ibadah Umum" | "Sekolah Minggu" | "Pemahaman Alkitab",
      date: formDate,
      theme: formData.get("theme") as string,
      verse: (formData.get("verse") as string) || "",
      description: (formData.get("description") as string) || "",
      speaker: (formData.get("speaker") as string) || "",
      hasHolyCommunion: formData.get("hasHolyCommunion") === "on",
      liturgyLink: (formData.get("liturgyLink") as string) || "",
      tenantId: "gpstiaa",
    };

    if (selectedItem?.id) {
      await setDoc(doc(db, "worship_themes", selectedItem.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      await setDoc(doc(collection(db, "worship_themes")), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    }
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteDoc(doc(db, "worship_themes", itemToDelete));
      setItemToDelete(null);
    }
  };

  const downloadTemplate = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");
      const ws = utils.json_to_sheet([
        { 
          "Tanggal (YYYY-MM-DD atau Indonesia)": "25 Desember 2023", 
          "Jenis (Ibadah Umum/Sekolah Minggu/Pemahaman Alkitab)": "Ibadah Umum", 
          "Tema": "Menyambut Kelahiran Juruselamat", 
          "Ayat": "Lukas 2:1-20",
          "Deskripsi": "Ibadah spesial Natal",
          "Pengkhotbah (Opsional)": "Pdt. Budi",
          "Perjamuan Kudus (Ya/Tidak)": "Ya",
          "Link Liturgi (Opsional)": "https://docs.google.com/..."
        }
      ]);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "TemplateTema");
      writeFile(wb, "Template_Bulk_TemaIbadah.xlsx");
    } catch (e) {
      console.error(e);
      addToast("Gagal mengunduh template", "error");
    }
  };

  const parseIndonesianDate = (dateStr: string) => {
    dateStr = dateStr.trim();
    if (!dateStr) return "";

    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    if (dateStr.match(/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/)) {
      const [d, m, y] = dateStr.split(/[\/\-]/);
      return `${y}-${m}-${d}`;
    }

    const textRegex = /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/;
    const match = dateStr.match(textRegex);
    if (match) {
      const d = match[1].padStart(2, '0');
      const mStr = match[2].toLowerCase();
      
      const monthMap: Record<string, string> = {
        januari: "01", jan: "01",
        februari: "02", pebruari: "02", feb: "02",
        maret: "03", mar: "03",
        april: "04", apr: "04",
        mei: "05",
        juni: "06", jun: "06",
        juli: "07", jul: "07",
        agustus: "08", agu: "08", aug: "08",
        september: "09", sep: "09",
        oktober: "10", okt: "10", oct: "10",
        november: "11", nov: "11",
        desember: "12", des: "12", dec: "12"
      };

      const m = monthMap[mStr];
      if (m) {
        return `${match[3]}-${m}-${d}`;
      }
    }
    return dateStr;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { read, utils } = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws) as any[];

      let added = 0;
      const batch = writeBatch(db);

      for (const row of rows) {
        const tglStr = row["Tanggal (YYYY-MM-DD atau Indonesia)"] || row["Tanggal (YYYY-MM-DD)"] || row["Tanggal"];
        if (!tglStr) continue;
        
        let formattedDate = parseIndonesianDate(tglStr.toString());

        const typeStr = (row["Jenis (Ibadah Umum/Sekolah Minggu/Pemahaman Alkitab)"] || row["Jenis"] || "").toString();
        const theme = (row["Tema"] || "").toString();
        const verse = (row["Ayat"] || "").toString();
        const description = (row["Deskripsi"] || "").toString();
        const speaker = (row["Pengkhotbah (Opsional)"] || row["Pembicara (Opsional)"] || row["Pembicara"] || row["Pengkhotbah"] || "").toString();
        const perjamuanStr = (row["Perjamuan Kudus (Ya/Tidak)"] || row["Perjamuan Kudus"] || "").toString().toLowerCase();
        const liturgyLink = (row["Link Liturgi (Opsional)"] || row["Link Liturgi"] || "").toString();
        
        const hasHolyCommunion = perjamuanStr === 'ya' || perjamuanStr === 'y' || perjamuanStr === 'true';

        if (!theme) continue;

        const docRef = doc(collection(db, "worship_themes"));
        batch.set(docRef, {
          tenantId: "gpstiaa",
          type: typeStr || "Ibadah Umum",
          date: formattedDate,
          theme: theme,
          verse: verse,
          description: description,
          speaker: speaker,
          hasHolyCommunion: hasHolyCommunion,
          liturgyLink: liturgyLink,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        added++;
      }

      if (added > 0) {
        await batch.commit();
        addToast(`Berhasil mengimpor ${added} tema ibadah.`, "success");
      } else {
        addToast("Tidak ada data valid yang ditemukan untuk diimpor.", "error");
      }
    } catch (err) {
      console.error("Error bulk import:", err);
      addToast("Gagal memproses file Excel.", "error");
    } finally {
      e.target.value = '';
    }
  };

  const uniqueYears = Array.from(new Set(items.map(item => {
    const parts = item.date.split('-');
    return parts.length === 3 ? parts[0] : '';
  }).filter(Boolean))).sort().reverse();

  const handleDeleteAll = async () => {
    if (!window.confirm("PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data Tema Ibadah yang sedang ditampilkan? Aksi ini tidak dapat dibatalkan!")) return;
    
    setIsDeletingAll(true);
    try {
      const batch = writeBatch(db);
      sortedFilteredItems.forEach((item) => {
        if (item.id) {
          batch.delete(doc(db, "worship_themes", item.id));
        }
      });
      await batch.commit();
      addToast(`Berhasil menghapus ${sortedFilteredItems.length} data.`, "success");
    } catch (e) {
      console.error(e);
      addToast("Terjadi kesalahan saat menghapus data massal.", "error");
    } finally {
      setIsDeletingAll(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (yearFilter !== "Semua") {
      const year = item.date.split('-')[0];
      if (year !== yearFilter) return false;
    }
    return true;
  });

  const sortedFilteredItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case "date_asc":
        return a.date.localeCompare(b.date);
      case "date_desc":
        return b.date.localeCompare(a.date);
      case "created_asc": {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tA - tB;
      }
      case "created_desc": {
        const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return tB - tA;
      }
      default:
        return b.date.localeCompare(a.date);
    }
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center shrink-0 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Tema Ibadah</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pencatatan tema ibadah & pembicara</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
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
          <select
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date_desc">Tanggal Terbaru</option>
            <option value="date_asc">Tanggal Terlama</option>
            <option value="created_desc">Waktu Input Terakhir</option>
            <option value="created_asc">Waktu Input Awal</option>
          </select>
          <button onClick={downloadTemplate} className="text-xs px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg flex items-center gap-1.5 font-medium transition-colors">
            <Download className="w-4 h-4" /> Template Excel
          </button>
          
          <div className="relative">
             <input type="file" id="upload-bulk-themes" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
             <label htmlFor="upload-bulk-themes" className="text-xs px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg flex items-center gap-1.5 font-medium cursor-pointer transition-colors border border-indigo-200 dark:border-indigo-800">
               <Upload className="w-4 h-4" /> Import Excel
             </label>
          </div>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Copy className="w-4 h-4" /> Input Massal (Paste)
          </button>

          <button
            onClick={handleDeleteAll}
            disabled={isDeletingAll || sortedFilteredItems.length === 0}
            className="text-xs px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-1.5 font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Hapus Data Terfilter
          </button>

          <button
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Tema
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <p className="text-center p-4">Memuat data...</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-center p-4 text-slate-500">Belum ada data tema ibadah.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm text-left whitespace-nowrap min-w-full">
              <thead className="bg-slate-50 dark:bg-slate-900 font-medium text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Jenis Ibadah</th>
                  <th className="p-3">Tema</th>
                  <th className="p-3">Ayat</th>
                  <th className="p-3">Pengkhotbah</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedFilteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-mono">{formatDateDDMMYYYY(item.date)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        item.type === 'Ibadah Umum' ? 'bg-blue-100 text-blue-700' :
                        item.type === 'Sekolah Minggu' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                      {item.liturgyLink ? (
                        <a href={item.liturgyLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
                          {item.theme}
                        </a>
                      ) : (
                        item.theme
                      )}
                      {item.hasHolyCommunion && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                          Perjamuan Kudus
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">{item.verse || "-"}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{item.speaker || "-"}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openModal(item)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => setItemToDelete(item.id!)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">{selectedItem ? "Edit" : "Tambah"} Tema Ibadah</h3>
            <form onSubmit={handleSave} className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Tanggal</label>
                  <DateInputMask required name="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} placeholder="DD-MM-YYYY" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Jenis Ibadah</label>
                  <select required name="type" defaultValue={selectedItem?.type || "Ibadah Umum"} className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900">
                    <option value="Ibadah Umum">Ibadah Umum</option>
                    <option value="Sekolah Minggu">Sekolah Minggu</option>
                    <option value="Pemahaman Alkitab">Pemahaman Alkitab</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Tema / Judul Khotbah</label>
                <input required name="theme" defaultValue={selectedItem?.theme} placeholder="mis. Kasih Karunia" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div>
                <label className="block mb-1 font-medium">Link Liturgi (Opsional)</label>
                <input type="url" name="liturgyLink" defaultValue={selectedItem?.liturgyLink} placeholder="https://docs.google.com/..." className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div>
                <label className="block mb-1 font-medium">Ayat <span className="text-slate-400 font-normal">(Opsional)</span></label>
                <input name="verse" defaultValue={selectedItem?.verse} placeholder="mis. Yohanes 3:16" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div>
                <label className="block mb-1 font-medium">Deskripsi Singkat <span className="text-slate-400 font-normal">(Opsional)</span></label>
                <textarea name="description" defaultValue={selectedItem?.description} placeholder="mis. Catatan tentang tema ibadah..." className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" rows={2}></textarea>
              </div>
              <div>
                <label className="block mb-1 font-medium">Nama Pengkhotbah <span className="text-slate-400 font-normal">(Opsional)</span></label>
                <input name="speaker" defaultValue={selectedItem?.speaker} placeholder="mis. Pdt. X" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="hasHolyCommunion" name="hasHolyCommunion" defaultChecked={selectedItem?.hasHolyCommunion} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer" />
                <label htmlFor="hasHolyCommunion" className="font-medium cursor-pointer">Ada Perjamuan Kudus</label>
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
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Hapus Tema?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Data tidak dapat dikembalikan.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setItemToDelete(null)} className="px-4 py-2 border rounded-lg dark:border-slate-600">Batal</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}

      <BulkThemeModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={(count) => addToast(`Berhasil mengimpor ${count} tema ibadah.`, "success")}
      />
    </div>
  );
}
