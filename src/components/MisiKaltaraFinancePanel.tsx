import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where, writeBatch } from "firebase/firestore";
import { Plus, Edit2, Trash2, ExternalLink, List, Search, Upload, Printer } from "lucide-react";
import { db } from "../lib/firebase";
import { MisiFinance } from "../types";
import { formatDateDDMMYYYY } from "../lib/utils";
import DateInputMask from "./DateInputMask";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import BulkMisiFinanceModal from "./BulkMisiFinanceModal";
import { useToast } from "../ToastContext";

export default function MisiKaltaraFinancePanel({ collectionName = "misi_finance" }: { collectionName?: string }) {
  const { addToast } = useToast();
  const [items, setItems] = useState<MisiFinance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MisiFinance | undefined>(undefined);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const [yearFilter, setYearFilter] = useState("Semua");
  const [showAllModal, setShowAllModal] = useState(false);
  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);
  const [formDate, setFormDate] = useState("");

  const openModal = (item?: MisiFinance) => {
    setSelectedItem(item);
    setFormDate(item?.date || new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const q = query(
      collection(db, collectionName),
      where("tenantId", "==", "gpstiaa"),
      orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: MisiFinance[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as MisiFinance);
      });
      setItems(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const type = formData.get("type") as "Pemasukan" | "Pengeluaran";
    const amount = Number(formData.get("amount"));
    const fundingSource = formData.get("fundingSource") as string;

    const data = {
      date: formDate,
      type,
      category: formData.get("category") as string,
      amount,
      description: formData.get("description") as string,
      tenantId: "gpstiaa",
      ...(fundingSource ? { fundingSource } : {})
    };

    if (selectedItem?.id) {
      await setDoc(doc(db, collectionName, selectedItem.id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
    } else {
      const batch = writeBatch(db);
      const newDocRef = doc(collection(db, collectionName));
      batch.set(newDocRef, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      
      if (collectionName === "misi_finance_pembangunan" && fundingSource === "Persembahan Misi Kaltara" && type === "Pemasukan") {
         const expenseRef = doc(collection(db, "misi_finance"));
         batch.set(expenseRef, {
            date: data.date,
            type: "Pengeluaran",
            category: "Alokasi Pembangunan",
            amount,
            description: `Alokasi ke Keuangan Pembangunan otomatis: ${data.category}`,
            tenantId: "gpstiaa",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
         });
      }
      await batch.commit();
    }
    setIsModalOpen(false);
  };

  const handleBulkSave = async (data: MisiFinance[]) => {
    const batch = writeBatch(db);
    data.forEach(item => {
      const docRef = doc(collection(db, collectionName));
      batch.set(docRef, { ...item, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });
    await batch.commit();
    setIsBulkEntryOpen(false);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      await deleteDoc(doc(db, collectionName, itemToDelete));
      setItemToDelete(null);
    }
  };

  // Derive unique years for filter
  const uniqueYears = Array.from(new Set(items.map(item => {
    const parts = item.date.split('-');
    return parts.length === 3 ? parts[0] : '';
  }).filter(Boolean))).sort().reverse();

  const filteredItems = items.filter(item => {
    if (yearFilter !== "Semua") {
      const year = item.date.split('-')[0];
      if (year !== yearFilter) return false;
    }
    return true;
  });

  // Calculate stats
  const totalPemasukan = filteredItems.filter(i => i.type === "Pemasukan").reduce((sum, item) => sum + item.amount, 0);
  const totalPengeluaran = filteredItems.filter(i => i.type === "Pengeluaran").reduce((sum, item) => sum + item.amount, 0);
  const saldo = totalPemasukan - totalPengeluaran;

  // Prepare chart data (Monthly aggregation for the selected year)
  const chartData = React.useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const aggregated: Record<string, { month: string; Pemasukan: number; Pengeluaran: number; sortIdx: number }> = {};
    
    // Initialize months in order
    if (yearFilter !== "Semua") {
      months.forEach((m, idx) => {
        aggregated[m] = { month: m, Pemasukan: 0, Pengeluaran: 0, sortIdx: idx };
      });
      filteredItems.forEach(item => {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          const mIdx = parseInt(parts[1], 10) - 1;
          const monthName = months[mIdx];
          if (aggregated[monthName]) {
            aggregated[monthName][item.type] += item.amount;
          }
        }
      });
      return Object.values(aggregated).sort((a, b) => a.sortIdx - b.sortIdx);
    } else {
      // Group by year if "Semua" is selected
      filteredItems.forEach(item => {
        const year = item.date.split("-")[0];
        if (!aggregated[year]) {
          aggregated[year] = { month: year, Pemasukan: 0, Pengeluaran: 0, sortIdx: parseInt(year, 10) };
        }
        aggregated[year][item.type] += item.amount;
      });
      return Object.values(aggregated).sort((a, b) => a.sortIdx - b.sortIdx);
    }
  }, [filteredItems, yearFilter]);

  const rp = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF("p", "pt", "a4"); // Portrait
      
      const img1 = new Image();
      img1.crossOrigin = "Anonymous";
      img1.src = "https://i.ibb.co.com/HTcTMCcr/GPSTIAA-LOGO-1.png";
      const img2 = new Image();
      img2.crossOrigin = "Anonymous";
      img2.src = "https://i.ibb.co.com/zHfFFrd1/AA-2-1-2-1.png";

      await Promise.all([
        new Promise<void>((resolve) => {
          img1.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img1.width;
              canvas.height = img1.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img1, 0, 0);
                const dataURL = canvas.toDataURL("image/png");
                doc.addImage(dataURL, 'PNG', 40, 30, 45, 45);
              }
            } catch (e) {
              console.error("Failed to add image1", e);
            }
            resolve();
          };
          img1.onerror = () => resolve();
        }),
        new Promise<void>((resolve) => {
          img2.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = img2.width;
              canvas.height = img2.height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img2, 0, 0);
                const dataURL = canvas.toDataURL("image/png");
                doc.addImage(dataURL, 'PNG', 95, 30, 45, 45);
              }
            } catch (e) {
              console.error("Failed to add image2", e);
            }
            resolve();
          };
          img2.onerror = () => resolve();
        })
      ]);

      const isPembangunan = collectionName === "misi_finance_pembangunan";
      const title = isPembangunan ? "Laporan Keuangan Pembangunan Misi Kaltara" : "Laporan Keuangan Misi Kaltara";

      // Title
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(title, 150, 52);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Periode Cetak: ${yearFilter}  |  Tanggal: ${formatDateDDMMYYYY(new Date().toISOString())}`, 150, 70);
      doc.setTextColor(0, 0, 0);
      
      const tableColumns = ["Tanggal", "Kategori / Keterangan", "Jenis", "Pemasukan", "Pengeluaran", "Subtotal Pemasukan", "Subtotal Pengeluaran"];
      
      let runningPemasukan = 0;
      let runningPengeluaran = 0;

      // Sort chronological for PDF
      const sortedItems = [...filteredItems].reverse();

      const tableRows = sortedItems.map(item => {
        if (item.type === "Pemasukan") runningPemasukan += item.amount;
        if (item.type === "Pengeluaran") runningPengeluaran += item.amount;
        
        return [
          formatDateDDMMYYYY(item.date),
          `${item.category}${item.description ? `\n- ${item.description}` : ''}`,
          item.type,
          item.type === "Pemasukan" ? rp(item.amount) : "-",
          item.type === "Pengeluaran" ? rp(item.amount) : "-",
          rp(runningPemasukan),
          rp(runningPengeluaran)
        ];
      });

      autoTable(doc, {
        startY: 95,
        head: [tableColumns],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 80;
      
      // Draw Summary box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, finalY + 20, 500, 110, 5, 5, 'FD');

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("RINGKASAN KEUANGAN", 55, finalY + 40);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      
      doc.text(`Total Pemasukan:`, 55, finalY + 65);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`${rp(totalPemasukan)}`, 200, finalY + 65);

      doc.setTextColor(50, 50, 50);
      doc.text(`Total Pengeluaran:`, 55, finalY + 85);
      doc.setTextColor(239, 68, 68); // red-500
      doc.text(`${rp(totalPengeluaran)}`, 200, finalY + 85);

      doc.setTextColor(50, 50, 50);
      doc.text(isPembangunan ? `Saldo Khusus Pembangunan:` : `Saldo Akhir:`, 55, finalY + 110);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(saldo >= 0 ? 16 : 239, saldo >= 0 ? 185 : 68, saldo >= 0 ? 129 : 68);
      doc.text(`${rp(saldo)}`, 200, finalY + 110);

      doc.save(`${title.replace(/ /g, "_")}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      addToast(`Gagal mengunduh laporan PDF ${collectionName === "misi_finance_pembangunan" ? "Pembangunan " : ""}Misi Kaltara.`, "error");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto w-full">
      <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-center justify-between shrink-0">
        <select
          className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="Semua">Semua Waktu</option>
          {uniqueYears.map((yr, idx) => (
            <option key={idx} value={yr}>{yr}</option>
          ))}
        </select>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Unduh Laporan {collectionName === "misi_finance_pembangunan" ? "Pembangunan" : "Misi"}
          </button>
          <button
            onClick={() => setIsBulkEntryOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Input Massal
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Transaksi Baru
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-12 h-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Pemasukan</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{rp(totalPemasukan)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 rounded-xl p-4 shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Total Pengeluaran</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{rp(totalPengeluaran)}</p>
        </div>
        <div className={`border rounded-xl p-4 shadow-sm flex flex-col justify-center relative overflow-hidden ${saldo >= 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Saldo Akhir</p>
          <p className={`text-xl font-bold ${saldo >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>{rp(saldo)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 shrink-0 pb-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col min-h-[300px]">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 text-sm">Grafik Keuangan {yearFilter !== "Semua" ? yearFilter : ""}</h3>
          <div className="flex-1 min-h-0 w-full text-xs">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b'}} 
                    tickFormatter={(value) => `Rp${(value/1000000).toFixed(1)}Jt`} 
                  />
                  <Tooltip 
                    cursor={{fill: '#334155', opacity: 0.1}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => rp(value)}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="Pemasukan" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Pengeluaran" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-400">Tidak ada data untuk grafik</div>
            )}
          </div>
        </div>

        {/* Transactions list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col overflow-hidden min-h-[300px]">
          <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Riwayat Transaksi</h3>
          </div>
          <div className="flex-1 overflow-y-auto w-full p-0">
            {isLoading ? (
              <p className="text-center p-4 text-sm text-slate-500">Memuat data...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-center p-4 text-sm text-slate-500">Belum ada transaksi.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.slice(0, 10).map(item => (
                  <div key={item.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex gap-2 items-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{formatDateDDMMYYYY(item.date)}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openModal(item)} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setItemToDelete(item.id!)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.category}</p>
                            {item.description && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{item.description}</p>}
                        </div>
                        <span className={`text-sm font-bold whitespace-nowrap ${item.type === 'Pemasukan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {item.type === 'Pemasukan' ? '+' : '-'}{rp(item.amount)}
                        </span>
                    </div>
                  </div>
                ))}
                
                {filteredItems.length > 10 && (
                  <div className="p-3 text-center bg-slate-50 dark:bg-slate-800/50">
                    <button 
                      onClick={() => setShowAllModal(true)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Lihat {filteredItems.length - 10} Transaksi Lainnya
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isBulkEntryOpen && (
        <BulkMisiFinanceModal
          isOpen={isBulkEntryOpen}
          onClose={() => setIsBulkEntryOpen(false)}
          onSave={handleBulkSave}
        />
      )}

      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Semua Riwayat Transaksi</h3>
              <button onClick={() => setShowAllModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">Tutup</button>
            </div>
            <div className="flex-1 overflow-y-auto w-full p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map(item => (
                  <div key={item.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex gap-2 items-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.type === 'Pemasukan' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type}
                        </span>
                        <span className="text-xs font-mono text-slate-500">{formatDateDDMMYYYY(item.date)}</span>
                      </div>
                      <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setShowAllModal(false); openModal(item); }} className="p-1 text-slate-400 hover:text-blue-500"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => { setShowAllModal(false); setItemToDelete(item.id!); }} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-end mt-2">
                        <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.category}</p>
                            {item.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>}
                        </div>
                        <span className={`text-base font-bold whitespace-nowrap ${item.type === 'Pemasukan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {item.type === 'Pemasukan' ? '+' : '-'}{rp(item.amount)}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-slate-100">{selectedItem ? "Edit" : "Tambah"} Transaksi</h3>
            <form onSubmit={handleSave} className="space-y-4 text-sm text-slate-800 dark:text-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Tanggal</label>
                  <DateInputMask required name="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} placeholder="DD/MM/YYYY" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Jenis</label>
                  <select required name="type" defaultValue={selectedItem?.type || "Pemasukan"} className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900">
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-medium">Kategori Keterangan</label>
                  <input required name="category" defaultValue={selectedItem?.category} placeholder="mis. Persembahan Kasih" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Jumlah (Rp)</label>
                  <input required type="number" min="0" step="1" name="amount" defaultValue={selectedItem?.amount} placeholder="100000" className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900" />
                </div>
              </div>
              {collectionName === "misi_finance_pembangunan" && (
                  <div>
                    <label className="block mb-1 font-medium">Sumber Dana</label>
                    <select name="fundingSource" defaultValue={(selectedItem as any)?.fundingSource || "Lainnya"} className="w-full border dark:border-slate-600 rounded-lg p-2 dark:bg-slate-900">
                      <option value="Lainnya">Terpisah / Lainnya</option>
                      <option value="Persembahan Misi Kaltara">Diambil dari Keuangan Misi Kaltara</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Jika diambil dari Keuangan Misi Kaltara, saldo Misi Kaltara akan otomatis berkurang sebesar jumlah pemasukan ini.</p>
                  </div>
              )}
              <div>
                <label className="block mb-1 font-medium">Catatan Tambahan</label>
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
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Hapus Transaksi?</h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">Data transaksi ini akan dihapus secara permanen.</p>
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
