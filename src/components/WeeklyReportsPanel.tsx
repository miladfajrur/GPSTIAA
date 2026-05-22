import React, { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import { Plus, Edit2, Trash2, Download, Printer, Upload } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { db } from "../lib/firebase";
import { WeeklyReport } from "../types";
import WeeklyReportModal from "./WeeklyReportModal";
import BulkReportModal from "./BulkReportModal";
import DateInputMask from "./DateInputMask";
import MonthYearInputMask from "./MonthYearInputMask";
import { TableProperties } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "../ToastContext";
import { formatDateDDMMYYYY } from "../lib/utils";

export default function WeeklyReportsPanel() {
  const { addToast } = useToast();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [ibadahFilter, setIbadahFilter] = useState<string>("Semua");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | undefined>(undefined);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const [dateFilterMode, setDateFilterMode] = useState<string>("Bulan");
  const [monthYearFilter, setMonthYearFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Extract unique "Nama Ibadah" for dropdown filter
  const uniqueNamaIbadah = Array.from(new Set(reports.map(r => r.nama_ibadah).filter(Boolean)));

  const filteredReports = reports.filter(r => {
    const matchesIbadah = ibadahFilter === "Semua" ? true : r.nama_ibadah === ibadahFilter;
    if (!matchesIbadah) return false;

    if (dateFilterMode === "Semua") return true;

    const reportDate = new Date(r.tanggal_ibadah);
    const now = new Date();

    if (dateFilterMode === "Bulan Ini") {
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
    }

    if (dateFilterMode === "Bulan Lalu") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return reportDate.getMonth() === lastMonth.getMonth() && reportDate.getFullYear() === lastMonth.getFullYear();
    }

    if (dateFilterMode === "Bulan") {
      if (!monthYearFilter) return true;
      const parts = monthYearFilter.split('-');
      if (parts.length === 2 && parts[0].length === 4) { // it sends back YYYY-MM
        return reportDate.getMonth() + 1 === parseInt(parts[1], 10) && reportDate.getFullYear() === parseInt(parts[0], 10);
      }
      return false;
    }

    if (dateFilterMode === "Kustom") {
      let matchesStart = true;
      let matchesEnd = true;
      if (startDate) {
        const sDate = new Date(startDate);
        sDate.setHours(0, 0, 0, 0);
        matchesStart = reportDate >= sDate;
      }
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        matchesEnd = reportDate <= eDate;
      }
      return matchesStart && matchesEnd;
    }

    return true;
  });

  useEffect(() => {
    const q = query(
      collection(db, "weekly_reports"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("tanggal_ibadah", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: WeeklyReport[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as WeeklyReport);
      });
      setReports(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching reports:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSaveReport = async (reportData: Partial<WeeklyReport>) => {
    try {
      if (selectedReport && selectedReport.id) {
        // Edit
        const docRef = doc(db, "weekly_reports", selectedReport.id);
        const submitData = { ...reportData, updatedAt: serverTimestamp() };
        delete submitData.id;
        await setDoc(docRef, submitData, { merge: true });
      } else {
        // Create
        const docRef = doc(collection(db, "weekly_reports"));
        await setDoc(docRef, {
          ...reportData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const confirmDelete = async () => {
    if (reportToDelete) {
      try {
        await deleteDoc(doc(db, "weekly_reports", reportToDelete));
        setReportToDelete(null);
      } catch (error) {
        console.error("Error deleting report: ", error);
        addToast("Gagal menghapus laporan.", "error");
      }
    }
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
  };

  const formatDate = (dateString: string) => {
    return formatDateDDMMYYYY(dateString);
  };

  const handleDownloadTemplateExcel = () => {
    const templateData = [{
      "Tanggal Ibadah": "2023-12-31",
      "Nama Ibadah": "Ibadah Minggu Raya",
      "Kehadiran Dewasa": 150,
      "Kehadiran Pemuda": 50,
      "Kehadiran Anak": 30,
      "Persembahan Umum": 1500000,
      "Perpuluhan": 5000000,
      "Diakonia": 500000,
      "Pemasukan Lainnya": 0,
      "Keterangan": "Ibadah berjalan lancar"
    }];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_Impor_Laporan_Kebaktian.xlsx");
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);
        
        let importedCount = 0;
        
        for (const row of rows) {
          const tanggal_ibadah = (row["Tanggal Ibadah"] || "").toString().trim();
          const nama_ibadah = (row["Nama Ibadah"] || "").toString().trim();
          
          if (!tanggal_ibadah || !nama_ibadah) continue;
          
          const docRef = doc(collection(db, "weekly_reports"));
          await setDoc(docRef, {
            tanggal_ibadah,
            nama_ibadah,
            kehadiran_dewasa: Number(row["Kehadiran Dewasa"]) || 0,
            kehadiran_pemuda: Number(row["Kehadiran Pemuda"]) || 0,
            kehadiran_anak: Number(row["Kehadiran Anak"]) || 0,
            persembahan_umum: Number(row["Persembahan Umum"]) || 0,
            perpuluhan: Number(row["Perpuluhan"]) || 0,
            diakonia: Number(row["Diakonia"]) || 0,
            pemasukan_lainnya: Number(row["Pemasukan Lainnya"]) || 0,
            keterangan: (row["Keterangan"] || "").toString(),
            tenantId: "gpstiaa",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          importedCount++;
        }
        
        addToast(`Berhasil mengimpor ${importedCount} data laporan mingguan.`, "success");
      } catch (error) {
        console.error("Error importing Excel:", error);
        addToast("Terjadi kesalahan saat memproses file Excel.", "error");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportExcel = () => {
    const excelData = filteredReports.map(r => ({
      "Tanggal Ibadah": r.tanggal_ibadah,
      "Nama Ibadah": r.nama_ibadah,
      "Kehadiran Dewasa": r.kehadiran_dewasa,
      "Kehadiran Pemuda": r.kehadiran_pemuda,
      "Kehadiran Anak": r.kehadiran_anak,
      "Total Kehadiran": (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0),
      "Persembahan Umum": r.persembahan_umum,
      "Perpuluhan": r.perpuluhan,
      "Diakonia": r.diakonia,
      "Pemasukan Lainnya": r.pemasukan_lainnya || 0,
      "Total Pemasukan": (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0),
      "Keterangan": r.keterangan || ""
    }));
    
    // Using import * as XLSX dynamically since it's already installed via Dashboard changes, or rely on Papa if not available.
    // Wait, in this file XLSX isn't imported yet.
    import('xlsx').then(XLSX => {
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan_Kebaktian");
        XLSX.writeFile(workbook, `laporan_kebaktian_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  const handleExportPDFBulanan = async () => {
    if (!['Bulan', 'Bulan Ini', 'Bulan Lalu'].includes(dateFilterMode)) {
        addToast("Silakan gunakan filter 'Bulan Ini', 'Bulan Lalu', atau 'Bulan' untuk mengunduh laporan bulanan.", "info");
        return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF("l", "pt", "a4"); // Landscape
      
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

      let monthName = "";
      const now = new Date();
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      
      if (dateFilterMode === "Bulan Ini") {
        monthName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
      } else if (dateFilterMode === "Bulan Lalu") {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        monthName = `${monthNames[lastMonth.getMonth()]} ${lastMonth.getFullYear()}`;
      } else if (dateFilterMode === "Bulan" && monthYearFilter) {
        const parts = monthYearFilter.split('-');
        if (parts.length === 2) {
           monthName = `${monthNames[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
        }
      }

      // Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(`Laporan Catatan Kebaktian & Keuangan Bulanan - GPSTTIAA`, 150, 52);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Bulan: ${monthName || '-'}  |  Ibadah: ${ibadahFilter}  |  Tanggal Cetak: ${formatDateDDMMYYYY(new Date().toISOString())}`, 150, 70);
      doc.setTextColor(0, 0, 0);
      
      const tableColumns = [
        "Tanggal", "Nama Ibadah", "D/P/A", "T. Hadir", "Persembahan", "Perpuluhan", "Diakonia", "Lainnya", "Total Pemasukan"
      ];

      const tableRows = filteredReports.map(r => {
        const hadirD = r.kehadiran_dewasa || 0;
        const hadirP = r.kehadiran_pemuda || 0;
        const hadirA = r.kehadiran_anak || 0;
        const totalHadir = hadirD + hadirP + hadirA;
        const totalPemasukan = (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0);

        return [
          formatDate(r.tanggal_ibadah),
          r.nama_ibadah,
          `${hadirD}/${hadirP}/${hadirA}`,
          totalHadir,
          formatRupiah(r.persembahan_umum || 0),
          formatRupiah(r.perpuluhan || 0),
          formatRupiah(r.diakonia || 0),
          formatRupiah(r.pemasukan_lainnya || 0),
          formatRupiah(totalPemasukan)
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
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' },
          7: { halign: 'right' },
          8: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY || 80;
      
      // Prepare summary data
      const totalPersembahan = filteredReports.reduce((acc, r) => acc + (r.persembahan_umum || 0), 0);
      const totalPerpuluhan = filteredReports.reduce((acc, r) => acc + (r.perpuluhan || 0), 0);
      const totalDiakonia = filteredReports.reduce((acc, r) => acc + (r.diakonia || 0), 0);
      const totalLainnya = filteredReports.reduce((acc, r) => acc + (r.pemasukan_lainnya || 0), 0);
      const totalAllPemasukan = totalPersembahan + totalPerpuluhan + totalDiakonia + totalLainnya;

      // Draw Summary box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(40, finalY + 20, 500, 150, 5, 5, 'FD');

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("RINGKASAN BULAN INI", 55, finalY + 40);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      
      doc.text(`Persembahan Umum:`, 55, finalY + 65);
      doc.text(`${formatRupiah(totalPersembahan)}`, 200, finalY + 65);

      doc.text(`Perpuluhan:`, 55, finalY + 85);
      doc.text(`${formatRupiah(totalPerpuluhan)}`, 200, finalY + 85);

      doc.text(`Diakonia:`, 55, finalY + 105);
      doc.text(`${formatRupiah(totalDiakonia)}`, 200, finalY + 105);

      doc.text(`Lainnya:`, 55, finalY + 125);
      doc.text(`${formatRupiah(totalLainnya)}`, 200, finalY + 125);

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);

      doc.text(`Total Pemasukan Bulan ${monthName || ''}:`, 55, finalY + 155);
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text(`${formatRupiah(totalAllPemasukan)}`, 300, finalY + 155);

      doc.save(`Laporan_Kebaktian_Bulanan_${monthName ? monthName.replace(' ', '_') : new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      addToast("Gagal mengunduh laporan PDF Bulanan.", "error");
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;

      const doc = new jsPDF("l", "pt", "a4"); // Landscape
      
      // Attempt to add logo using CORS proxy to bypass canvas tinting restrictions
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
              doc.addImage(dataURL, 'PNG', 95, 30, 45, 45); // placed next to it
            }
          } catch (e) {
            console.error("Failed to add image2", e);
          }
          resolve();
        };
        img2.onerror = () => resolve();
      })
    ]);

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Laporan Catatan Kebaktian & Keuangan Mingguan - GPSTTIAA`, 150, 52);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Periode Laporan: ${ibadahFilter}  |  Tanggal Cetak: ${formatDateDDMMYYYY(new Date().toISOString())}`, 150, 70);
    doc.setTextColor(0, 0, 0);
    
    const tableColumns = [
      "Tanggal", "Nama Ibadah", "D/P/A", "T. Hadir", "Persembahan", "Perpuluhan", "Diakonia", "Lainnya", "Total Pemasukan"
    ];

    const tableRows = filteredReports.map(r => {
      const hadirD = r.kehadiran_dewasa || 0;
      const hadirP = r.kehadiran_pemuda || 0;
      const hadirA = r.kehadiran_anak || 0;
      const totalHadir = hadirD + hadirP + hadirA;
      const totalPemasukan = (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0);

      return [
        formatDate(r.tanggal_ibadah),
        r.nama_ibadah,
        `${hadirD}/${hadirP}/${hadirA}`,
        totalHadir,
        formatRupiah(r.persembahan_umum || 0),
        formatRupiah(r.perpuluhan || 0),
        formatRupiah(r.diakonia || 0),
        formatRupiah(r.pemasukan_lainnya || 0),
        formatRupiah(totalPemasukan)
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
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] } // emerald-500
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 80;
    
    // Prepare summary data
    const totalAllPemasukan = filteredReports.reduce((acc, r) => acc + (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0), 0);

    // Draw Summary box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, finalY + 20, 400, 100, 5, 5, 'FD');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text("RINGKASAN TOTAL", 55, finalY + 40);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    
    doc.text(`Total Keseluruhan Pemasukan:`, 55, finalY + 65);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`${formatRupiah(totalAllPemasukan)}`, 250, finalY + 65);

    doc.save(`Laporan_Kebaktian_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      console.error(e);
      addToast("Gagal mengunduh laporan PDF.", "error");
    }
  };

  const chartData = [...filteredReports].reverse().map(r => ({
    name: formatDate(r.tanggal_ibadah).split(' ').slice(0, 2).join(' '),
    Dewasa: r.kehadiran_dewasa || 0,
    Pemuda: r.kehadiran_pemuda || 0,
    Anak: r.kehadiran_anak || 0,
    Total: (r.kehadiran_dewasa || 0) + (r.kehadiran_pemuda || 0) + (r.kehadiran_anak || 0),
    TotalPemasukan: (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0)
  }));

  const totalAllPemasukan = filteredReports.reduce((acc, r) => acc + (r.persembahan_umum || 0) + (r.perpuluhan || 0) + (r.diakonia || 0) + (r.pemasukan_lainnya || 0), 0);

  const summaryChartData = [
    { name: 'Pemasukan', value: totalAllPemasukan, fill: '#10B981' }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] overflow-hidden">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">Laporan Kebaktian & Keuangan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Arsip data kehadiran jemaat dan laporan pemasukan mingguan gereja</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportPDFBulanan}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none shrink-0"
          >
            <Printer className="w-4 h-4" /> Unduh Laporan Bulanan
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none"
          >
            <Printer className="w-4 h-4" /> Unduh Ringkasan PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none shrink-0"
          >
            <Download className="w-4 h-4" /> Unduh Laporan Excel
          </button>
          
          <div className="relative group shrink-0">
             <button
               className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none"
             >
               <Upload className="w-4 h-4" /> Impor Excel
             </button>
             <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                <div className="p-1.5 flex flex-col gap-1">
                  <button
                    onClick={handleDownloadTemplateExcel}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md transition-colors flex items-center gap-2"
                  >
                    <Download className="h-3.5 w-3.5" /> Template Excel
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-700 rounded-full animate-spin shrink-0"></span> Mengimpor...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" /> Pilih File Excel
                      </>
                    )}
                  </button>
                </div>
             </div>
          </div>
          
          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            onChange={handleImportExcel}
            className="hidden"
          />

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 focus:outline-none"
          >
            <TableProperties className="w-4 h-4" /> Input Massal
          </button>
          <button
            onClick={() => {
              setSelectedReport(undefined);
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-lg font-semibold transition-colors focus:outline-none flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Tambah Laporan
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex flex-col">
        {reports.length > 0 && !isLoading && (
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div>
               <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">Grafik Tren Kehadiran</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} />
                     <XAxis dataKey="name" tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" />
                     <YAxis tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" />
                     <RechartsTooltip 
                        contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b', fontSize: '12px' }}
                        itemStyle={{ color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#475569' }}
                     />
                     <Legend wrapperStyle={{ fontSize: '11px', color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#475569' }} />
                     <Line type="monotone" dataKey="Dewasa" stroke="#1E3A8A" strokeWidth={2} dot={{ r: 3 }} animationDuration={1500} animationEasing="ease-out" />
                     <Line type="monotone" dataKey="Pemuda" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} animationDuration={1500} animationEasing="ease-out" />
                     <Line type="monotone" dataKey="Anak" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} animationDuration={1500} animationEasing="ease-out" />
                     <Line type="monotone" dataKey="Total" stroke="#64748B" strokeDasharray="4 4" strokeWidth={2} dot={false} animationDuration={1500} animationEasing="ease-out" />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
             
             <div>
               <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 uppercase tracking-wider">Grafik Keuangan</h3>
               <div className="h-48 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} />
                     <XAxis dataKey="name" tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" />
                     <YAxis tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} />
                     <RechartsTooltip 
                        contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b', fontSize: '12px' }}
                        itemStyle={{ color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#475569' }}
                        formatter={(value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
                     />
                     <Legend wrapperStyle={{ fontSize: '11px' }} />
                     <Line type="monotone" name="Total Pemasukan" dataKey="TotalPemasukan" stroke="#10B981" strokeWidth={2} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} animationDuration={1500} animationEasing="ease-out" />
                   </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>
        )}
        
        {/* Table Controls (Filter) */}
        {!isLoading && reports.length > 0 && (
          <div className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800/80 dark:border-slate-700 px-4 py-3 flex flex-wrap gap-3 justify-end items-center">
            <div className="flex items-center gap-2">
              <label htmlFor="date-filter" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Waktu:</label>
              <select
                id="date-filter"
                className="text-sm border flex-1 md:w-auto border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                value={dateFilterMode}
                onChange={(e) => setDateFilterMode(e.target.value)}
              >
                <option value="Semua">Semua</option>
                <option value="Bulan Ini">Bulan Ini</option>
                <option value="Bulan Lalu">Bulan Lalu</option>
                <option value="Bulan">Pilih Bulan (MM-YYYY)</option>
                <option value="Kustom">Kustom (DD-MM-YYYY)</option>
              </select>
            </div>

            {dateFilterMode === "Bulan" && (
              <div className="flex items-center gap-2">
                <MonthYearInputMask
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 w-28"
                  value={monthYearFilter}
                  onChange={(e) => setMonthYearFilter(e.target.value)}
                />
              </div>
            )}

            {dateFilterMode === "Kustom" && (
              <div className="flex items-center gap-2">
                <DateInputMask
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 w-28"
                  value={startDate}
                  name="startDate"
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                />
                <span className="text-slate-500 dark:text-slate-400">-</span>
                <DateInputMask
                  className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 w-28"
                  value={endDate}
                  name="endDate"
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="DD-MM-YYYY"
                />
              </div>
            )}

            <div className="hidden sm:block w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1"></div>

            <div className="flex items-center gap-2">
              <label htmlFor="ibadah-filter" className="text-sm font-semibold text-slate-600 dark:text-slate-300">Ibadah:</label>
              <select
                id="ibadah-filter"
                className="text-sm border flex-1 md:w-auto border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
                value={ibadahFilter}
                onChange={(e) => setIbadahFilter(e.target.value)}
              >
                <option value="Semua">Semua Ibadah</option>
                {uniqueNamaIbadah.map((nama, idx) => (
                  <option key={idx} value={nama}>{nama}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <table className="w-full text-xs text-left border-collapse whitespace-nowrap min-w-max">
          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-700/50 shadow-sm z-10">
            <tr className="text-slate-500 dark:text-slate-300 uppercase font-bold border-b border-slate-200 dark:border-slate-700">
              <th className="p-3 whitespace-nowrap hidden sm:table-cell">Tanggal</th>
              <th className="p-3 border-r border-slate-200 dark:border-slate-700">Nama Ibadah</th>
              <th className="p-3 text-center border-r border-slate-200 dark:border-slate-700">Kehadiran<br/><span className="text-[10px] font-normal">(Dewasa/Pemuda/Anak)</span></th>
              <th className="p-3 whitespace-nowrap text-right">Pemasukan</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-800 dark:text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">Memuat data...</td>
              </tr>
            ) : filteredReports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">Tidak ada laporan minggu ini.</td>
              </tr>
            ) : (
              filteredReports.map((report) => {
                const totalKehadiran = (report.kehadiran_dewasa || 0) + (report.kehadiran_pemuda || 0) + (report.kehadiran_anak || 0);
                const totalPemasukan = (report.persembahan_umum || 0) + (report.perpuluhan || 0) + (report.diakonia || 0) + (report.pemasukan_lainnya || 0);
                
                return (
                  <tr key={report.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                    <td className="p-3 whitespace-nowrap font-medium hidden sm:table-cell">{formatDate(report.tanggal_ibadah)}</td>
                    <td className="p-3 font-semibold text-blue-700 dark:text-blue-400 border-r border-slate-100 dark:border-slate-700/50">
                      <div className="sm:hidden text-[10px] font-normal text-slate-500 mb-1">{formatDate(report.tanggal_ibadah)}</div>
                      {report.nama_ibadah}
                      {(report.keterangan) && <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400 truncate max-w-[200px] mt-1">{report.keterangan}</div>}
                    </td>
                    <td className="p-3 text-center border-r border-slate-100 dark:border-slate-700/50">
                      <div className="font-bold text-sm">{totalKehadiran}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex justify-center gap-2">
                        <span title="D">{report.kehadiran_dewasa || 0}</span> | 
                        <span title="P">{report.kehadiran_pemuda || 0}</span> | 
                        <span title="A">{report.kehadiran_anak || 0}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(totalPemasukan)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-500 hover:text-blue-700 mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit Laporan"
                      >
                        <Edit2 className="h-4 w-4 inline" />
                      </button>
                      <button
                        onClick={() => report.id && setReportToDelete(report.id)}
                        className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus Laporan"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredReports.length > 0 && !isLoading && (
            <tfoot className="bg-slate-50 dark:bg-slate-700/90 font-bold border-t-2 border-slate-200 dark:border-slate-600 shadow-sm z-10 sticky bottom-0 text-sm">
              <tr>
                <td colSpan={3} className="p-3 text-right border-r border-slate-200 dark:border-slate-600">
                  <div className="text-slate-600 dark:text-slate-300">TOTAL PEMASUKAN:</div>
                </td>
                <td className="p-3 text-right bg-emerald-50/50 dark:bg-emerald-900/10">
                  <div className="font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(totalAllPemasukan)}</div>
                </td>
                <td className="p-3"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {filteredReports.length > 0 && !isLoading && (
          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 shrink-0 mt-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-5xl mx-auto">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-2">Ringkasan Total</h3>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Pemasukan Keseluruhan</div>
                    <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatRupiah(totalAllPemasukan)}</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4">Grafik Komparasi</h3>
                <div className="h-48 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryChartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.2} vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 11, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10, fill: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b'}} stroke="#94a3b8" tickFormatter={(value) => `${(value/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#fff', border: 'none', borderRadius: '8px', color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#1e293b', fontSize: '12px' }}
                        formatter={(value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)}
                        cursor={{fill: document.documentElement.classList.contains('dark') ? '#334155' : '#f1f5f9'}}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                        {summaryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <WeeklyReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedReport}
        onSave={handleSaveReport}
      />

      <BulkReportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={(count) => {
          addToast(`Input massal berhasil! ${count} laporan baru ditambahkan.`, "success");
        }}
      />

      {/* Delete Confirmation Modal */}
      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Konfirmasi Penghapusan</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Apakah Anda yakin ingin menghapus laporan kebaktian ini?
            </p>
            <div className="flex justify-end gap-3 w-full">
              <button
                onClick={() => setReportToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
