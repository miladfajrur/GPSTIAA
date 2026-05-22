import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where, getCountFromServer, writeBatch } from "firebase/firestore";
import { ArrowLeft, Download, Plus, Search, LogOut, Edit2, Trash2, Filter, Users, PieChart as PieChartIcon, MapPin, Settings, Upload, Menu, UserCheck, CheckCircle, AlertCircle, Info, X, ChevronDown, MoreVertical, Gift, Bell, Eye, TableProperties, LayoutGrid, List, Sun, Moon, Camera, Folder, BookOpen, Globe, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { db } from "../lib/firebase";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import { useToast } from "../ToastContext";
import { Member } from "../types";
import { formatNameTitleCase, formatDateDDMMYYYY, getDirectDriveLink, getDaysToBirthday, isBirthdayInWeek } from "../lib/utils";

import MemberModal from "./MemberModal";
import MemberViewModal from "./MemberViewModal";
import BulkEntryModal from "./BulkEntryModal";
import DataValidationModal from "./DataValidationModal";
import OverviewPanel from "./OverviewPanel";
import WeeklyReportsPanel from "./WeeklyReportsPanel";
import MemberProfile from "./MemberProfile";
import MediaRepoPanel from "./MediaRepoPanel";
import DocumentPanel from "./DocumentPanel";
import WorshipThemePanel from "./WorshipThemePanel";
import MisiKaltaraPanel from "./MisiKaltaraPanel";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { addToast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const isInitialLoad = useRef(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>(undefined);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [memberToView, setMemberToView] = useState<Member | null>(null);

  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    return user?.username === 'BEM' ? 'birthdays' : 'overview';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [birthdayView, setBirthdayView] = useState<'grid' | 'list'>('grid');
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [selectedMapArea, setSelectedMapArea] = useState<string | null>(null);
  const [mapSortBy, setMapSortBy] = useState<'abjad' | 'jumlah'>('jumlah');
  const [mapStatusFilter, setMapStatusFilter] = useState<'semua' | 'aktif' | 'keluar'>('aktif');
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  const ketuaJemaat = "Pdt. Dr. Rei Rubin Barlian, M.Th.";

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Profile View State
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleManualSync = async () => {
    setIsSyncing(true);
    addToast("Menyinkronkan data dengan server...", "info");
    // Simulate a brief wait as Firebase automatically syncs, to give user feedback
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLastSyncTime(new Date());
    setIsSyncing(false);
    addToast("Data berhasil disinkronisasi", "success");
  };
  const canViewProfile = ['anabk', 'fajrur'].includes(user?.username || '');

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // DB Quota Usage States
  const [dbStats, setDbStats] = useState({ membersCount: 0, reportsCount: 0, loading: false });

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [baptisFilter, setBaptisFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Aktif"); // Default to "Aktif"
  const [birthdayStatusFilter, setBirthdayStatusFilter] = useState("Aktif"); // Default to "Aktif" for Birthdays
  const [birthdaySubTab, setBirthdaySubTab] = useState<'terdekat' | 'bulanIni' | 'mingguIni' | 'mingguLalu' | 'kustom'>('terdekat');
  const [birthdayCustomMonth, setBirthdayCustomMonth] = useState<number>(new Date().getMonth() + 1);
  const [sortBy, setSortBy] = useState("nama_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  
  const hasNotifiedBirthdays = useRef(false);

  useEffect(() => {
    if (members.length > 0 && !hasNotifiedBirthdays.current && !isLoading) {
      const todayBirthdays = members.filter(m => !m.tanggal_keluar && getDaysToBirthday(m.tanggal_lahir) === 0);
      if (todayBirthdays.length > 0) {
        const names = todayBirthdays.map(m => formatNameTitleCase(m.nama_lengkap)).join(', ');
        addToast(`🎉 Hari ini ulang tahun: ${names}!\nSelamat Ulang Tahun!`, 'info');
        
        // Show Browser Notification for admin
        if (user?.username === 'gpsttiaa' || (!['fajrur', 'anabk', 'BEM'].includes(user?.username || ''))) {
            if ("Notification" in window) {
                if (Notification.permission === "granted") {
                    new Notification("Ulang Tahun Hari Ini!", {
                        body: `🎉 ${names} berulang tahun hari ini!`,
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission().then(permission => {
                        if (permission === "granted") {
                            new Notification("Ulang Tahun Hari Ini!", {
                                body: `🎉 ${names} berulang tahun hari ini!`,
                            });
                        }
                    });
                }
            }
        }
        
        hasNotifiedBirthdays.current = true;
      }
    }
  }, [members, isLoading, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotificationOpen]);

  // Derived Notifications
  const notifications = useMemo(() => {
    const notifs = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Birthdays today
    members.forEach(m => {
      if (getDaysToBirthday(m.tanggal_lahir) === 0 && (!m.tanggal_keluar)) {
        notifs.push({
          id: `bday-${m.id}`,
          memberId: m.id,
          type: 'birthday',
          title: 'Ulang Tahun Hari Ini!',
          message: `${formatNameTitleCase(m.nama_lengkap)} berulang tahun hari ini.🎉`,
          dateRef: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0).getTime() // Virtual 7 AM
        });
      }
    });

    // 2. Recent changes (top 5)
    members
      .slice()
      .filter(m => m.createdAt || m.updatedAt)
      .sort((a, b) => {
        const getTime = (m: Member) => {
          if (m.updatedAt) {
            return m.updatedAt?.toMillis ? m.updatedAt.toMillis() : (m.updatedAt?.seconds ? m.updatedAt.seconds * 1000 : 0);
          }
          return m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.createdAt?.seconds ? m.createdAt.seconds * 1000 : 0);
        };
        return getTime(b) - getTime(a);
      })
      .slice(0, 5)
      .forEach(m => {
        const crTime = m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.createdAt?.seconds ? m.createdAt.seconds * 1000 : 0);
        const upTime = m.updatedAt?.toMillis ? m.updatedAt.toMillis() : (m.updatedAt?.seconds ? m.updatedAt.seconds * 1000 : 0);
        const isUpdate = upTime > crTime + 1000; // if updated at least 1s after creation
        
        const time = isUpdate ? upTime : crTime;
        
        if (time > 0) {
          notifs.push({
            id: `change-${m.id}-${time}`,
            memberId: m.id,
            type: 'new_data',
            title: isUpdate ? 'Data Diperbarui' : 'Data Berhasil Diinput',
            message: isUpdate 
              ? `Data jemaat ${formatNameTitleCase(m.nama_lengkap)} telah diperbarui.` 
              : `Data jemaat ${formatNameTitleCase(m.nama_lengkap)} telah ditambahkan ke sistem.`,
            dateRef: time
          });
        }
      });

    return notifs.sort((a, b) => b.dateRef - a.dateRef);
  }, [members]);

  // Greeting Modal State
  const [greetingMessage, setGreetingMessage] = useState<string | null>(null);

  useEffect(() => {
    const hasGreeted = sessionStorage.getItem(`greeted_${user?.username}`);
    if (user?.username && !hasGreeted) {
      const hour = new Date().getHours();
      let time = "Malam";
      if (hour >= 3 && hour < 11) time = "Pagi";
      else if (hour >= 11 && hour < 15) time = "Siang";
      else if (hour >= 15 && hour < 18) time = "Sore";
      
      let message = `Selamat ${time} ${user.username}`;
      if (user.username === "gpsttiaa") message = `Selamat ${time} Administrator`;
      else if (user.username === "fajrur") message = `Selamat ${time} Fajrur`;
      else if (user.username === "anabk") message = `Selamat ${time} Dr. Ana Budi Kristiani, S.Sn., M.M`;
      else if (user.username === "BEM") message = `Selamat ${time} Badan Exclusive Mahasiswa`;

      setGreetingMessage(message);
      sessionStorage.setItem(`greeted_${user.username}`, "true");
    }
  }, [user]); // Run once on user change

  useEffect(() => {
    const q = query(
      collection(db, "members"),
      where("tenantId", "==", "gpstiaa"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let newRemoteCount = 0;
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" && !isInitialLoad.current && !change.doc.metadata.hasPendingWrites) {
          newRemoteCount++;
        }
      });

      if (newRemoteCount > 0) {
        addToast(`${newRemoteCount} data jemaat baru ditambahkan tersinkronisasi.`, 'info');
      }

      const data: Member[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(data);
      setLastSyncTime(new Date());
      setIsLoading(false);

      if (isInitialLoad.current) {
        isInitialLoad.current = false;
      }
    }, (error) => {
      console.error("Firestore error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings') {
      const fetchDbStats = async () => {
        setDbStats(prev => ({ ...prev, loading: true }));
        try {
          // Note: using client side count requires getCountFromServer
          const membersQuery = query(collection(db, "members"));
          const reportsQuery = query(collection(db, "weekly_reports"));
          
          const [membersSnap, reportsSnap] = await Promise.all([
            getCountFromServer(membersQuery),
            getCountFromServer(reportsQuery)
          ]);

          setDbStats({
            membersCount: membersSnap.data().count,
            reportsCount: reportsSnap.data().count,
            loading: false
          });
        } catch (error) {
          console.error("Error fetching db stats:", error);
          setDbStats(prev => ({ ...prev, loading: false }));
        }
      };
      
      fetchDbStats();
    }
  }, [activeTab]);

  const handleSaveMember = async (memberData: Member) => {
    const { id, ...dataToSave } = memberData;
    const docId = id || doc(collection(db, "members")).id;
    const isNew = !id;

    if (isNew && dataToSave.nomor_anggota) {
        const isDuplicate = members.some((m) => m.nomor_anggota?.toLowerCase() === dataToSave.nomor_anggota?.toLowerCase());
        if (isDuplicate) {
            addToast(`ID No. Anggota ${dataToSave.nomor_anggota} sudah ada di database.`, 'error');
            throw new Error('DUPLICATE_ID');
        }
    } else if (!isNew && dataToSave.nomor_anggota) {
        // Ensure another person doesn't have same ID
        const isDuplicate = members.some((m) => m.nomor_anggota?.toLowerCase() === dataToSave.nomor_anggota?.toLowerCase() && m.id !== id);
        if (isDuplicate) {
            addToast(`ID No. Anggota ${dataToSave.nomor_anggota} sudah dipakai oleh jemaat lain.`, 'error');
            throw new Error('DUPLICATE_ID');
        }
    }
    
    // Scrub undefined fields to prevent Firestore crash
    const cleanData = Object.fromEntries(
      Object.entries(dataToSave).filter(([_, v]) => v !== undefined)
    );
    
    if (cleanData.nama_lengkap && typeof cleanData.nama_lengkap === 'string') {
        cleanData.nama_lengkap = formatNameTitleCase(cleanData.nama_lengkap);
    }

    const payload: any = {
      ...cleanData,
      tenantId: "gpstiaa",
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      payload.createdAt = serverTimestamp();
    } else if (cleanData.createdAt) {
      payload.createdAt = cleanData.createdAt;
    } else {
      payload.createdAt = serverTimestamp(); // Fallback if missing
    }

    try {
      const savePromise = setDoc(doc(db, "members", docId), payload, { merge: false });
      
      // Fallback timeout inside the promise chain so it never hangs infinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Timeout: Gagal terhubung ke Firebase setelah 15 detik.")), 15000)
      );
      
      await Promise.race([savePromise, timeoutPromise]);
      
      addToast(`Data jemaat ${cleanData.nama_lengkap} berhasil ${isNew ? 'ditambahkan' : 'diperbarui'}!`, 'success');
    } catch (error) {
      console.error("Error saving member to Firestore:", error);
      addToast("Gagal menyimpan data jemaat. Periksa koneksi internet atu rules Firestore.", "error");
      throw error; // Re-throw to be caught by MemberModal
    }
  };

  const handleDeleteClick = (id: string) => {
    setMemberToDelete(id);
  };

  const confirmDelete = async () => {
    if (memberToDelete) {
      try {
        await deleteDoc(doc(db, "members", memberToDelete));
        addToast("Data jemaat berhasil dihapus.", 'success');
      } catch (error) {
        console.error("Error deleting member:", error);
        addToast("Gagal menghapus data jemaat. Periksa hak akses Anda.", 'error');
      } finally {
        setMemberToDelete(null);
      }
    }
  };

  const handleExportExcel = async () => {
    try {
      addToast("Menyiapkan file Excel...", 'info');
      const XLSX = await import("xlsx");
      const excelData = members.map((m, index) => ({
        "No": index + 1,
        "Nomor Anggota": m.nomor_anggota,
        "Nama Lengkap": m.nama_lengkap,
        "Jenis Kelamin": m.jenis_kelamin,
        "Tempat Lahir": m.tempat_lahir,
        "Tanggal Lahir": m.tanggal_lahir,
        "No. Telp": m.no_telp || "-",
        "Alamat Asal": m.alamat_asal,
        "Provinsi": m.provinsi || "-",
        "Jenis Baptis": m.jenis_baptis,
        "Keterangan Baptis": m.keterangan_baptis,
        "Tanggal Masuk": m.tanggal_masuk,
        "Tanggal Atestasi": m.tanggal_keluar,
        "Link Foto": m.foto_url
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Jemaat");
      XLSX.writeFile(workbook, "Buku_Induk_GPSTIAA.xlsx");
      addToast("Berhasil mengunduh Excel.", 'success');
    } catch(e) {
      console.error(e);
      addToast("Gagal mengunduh Excel.", 'error');
    }
  };

  const handleExportPDF = async () => {
    try {
      addToast("Menyiapkan file PDF...", 'info');
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default;
      
      const doc = new jsPDF("l", "pt", "a4"); // Landscape
      
      // Attempt to add logo using CORS proxy to bypass canvas tinting restrictions
    const img1 = new Image();
    img1.crossOrigin = "Anonymous";
    img1.src = "https://i.ibb.co.com/HTcTMCcr/GPSTIAA-LOGO-1.png"; // Use proxy
    const img2 = new Image();
    img2.crossOrigin = "Anonymous";
    img2.src = "https://i.ibb.co.com/zHfFFrd1/AA-2-1-2-1.png"; // Use proxy

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
              doc.addImage(dataURL, 'PNG', 40, 30, 45, 45); // Slightly larger
            }
          } catch (e) {
            console.error("Failed to add image due to CORS", e);
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
            console.error("Failed to add image due to CORS", e);
          }
          resolve();
        };
        img2.onerror = () => resolve();
      })
    ]);
    
    // Titling
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Laporan Induk Data Jemaat GPSTTIAA", 150, 52); // Improved title
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Keseluruhan Jemaat: ${members.length} Jiwa  |  Tanggal Unduh: ${formatDateDDMMYYYY(new Date().toISOString())}`, 150, 70);
    doc.setTextColor(0, 0, 0);

    const tableColumns = ["No", "No. Anggota", "Nama Lengkap", "L/P", "Tempat, Tanggal Lahir", "No. Telp", "Alamat Asal", "Provinsi", "Jenis Baptis", "Tgl Masuk", "Tgl Atestasi"];
    const tableRows = members.map((m, index) => [
      index + 1,
      m.nomor_anggota || "-",
      m.nama_lengkap || "-",
      m.jenis_kelamin === "Pria" ? "L" : m.jenis_kelamin === "Wanita" ? "P" : "-",
      `${m.tempat_lahir || "-"}, ${m.tanggal_lahir || "-"}`,
      m.no_telp || "-",
      m.alamat_asal || "-",
      m.provinsi || "-",
      m.jenis_baptis || "-",
      m.tanggal_masuk || "-",
      m.tanggal_keluar || "-"
    ]);

    autoTable(doc, {
      head: [tableColumns],
      body: tableRows,
      startY: 95,
      styles: { fontSize: 8, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' }, // blue-900 equivalent
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid'
    });

    doc.save("Laporan_Induk_Jemaat_GPSTIAA.pdf");
    addToast("Berhasil mengunduh PDF.", 'success');
    } catch(e) {
      console.error(e);
      addToast("Gagal mengunduh PDF.", 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      addToast("Menyiapkan template...", 'info');
      const XLSX = await import("xlsx");
      const templateData = [{
      "Nomor Anggota": "1",
      "Nama Lengkap": "Nama Contoh",
      "Jenis Kelamin": "Pria",
      "Tempat Lahir": "Jakarta",
      "Tanggal Lahir": "1990-01-01",
      "No. Telp": "081234567890",
      "Alamat Asal": "Jl. Contoh Alamat No. 123",
      "Provinsi": "Kalimantan Utara",
      "Jenis Baptis": "Baptis Dewasa",
      "Keterangan Baptis": "Contoh keterangan (bisa dikosongkan)",
      "Tanggal Masuk": "2023-01-01",
      "Tanggal Atestasi": "",
      "Link Foto": ""
    }];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_Impor_Jemaat.xlsx");
    addToast("Berhasil mengunduh template.", 'success');
  } catch(e) {
    console.error(e);
    addToast("Gagal mengunduh template.", 'error');
  }
  };

  const handleImportExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any>(worksheet);

        const validMembers: Member[] = [];
        const existingNomor = new Set(members.map(m => m.nomor_anggota?.toLowerCase()).filter(n => n));
        const currentCsvNomor = new Set<string>();
        const errorMessages: string[] = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2; // approximation for feedback
          
          const nomor_anggota = (row["Nomor Anggota"] || "").toString().trim();
          const nama_lengkap = (row["Nama Lengkap"] || "").toString().trim();
          const jenis_kelamin = (row["Jenis Kelamin"] || "").toString().trim();
          
          if (!nomor_anggota || !nama_lengkap || !jenis_kelamin) {
             errorMessages.push(`Baris ${rowNum}: Kolom "Nomor Anggota", "Nama Lengkap", dan "Jenis Kelamin" wajib diisi.`);
             continue;
          }

          if (existingNomor.has(nomor_anggota.toLowerCase())) {
            errorMessages.push(`Baris ${rowNum}: Nomor Anggota '${nomor_anggota}' sudah terdaftar di sistem.`);
            continue;
          }

          if (currentCsvNomor.has(nomor_anggota.toLowerCase())) {
            errorMessages.push(`Baris ${rowNum}: Nomor Anggota '${nomor_anggota}' duplikat di dalam file excel.`);
            continue;
          }

          currentCsvNomor.add(nomor_anggota.toLowerCase());
          
          let formattedTanggalLahir = (row["Tanggal Lahir"] || "").toString().trim();
          if (formattedTanggalLahir.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            const [day, month, year] = formattedTanggalLahir.split('/');
            formattedTanggalLahir = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }

          validMembers.push({
            nomor_anggota,
            nama_lengkap,
            jenis_kelamin: (jenis_kelamin === "Pria" || jenis_kelamin === "Wanita") ? jenis_kelamin : "",
            tempat_lahir: (row["Tempat Lahir"] || "").toString().trim(),
            tanggal_lahir: formattedTanggalLahir,
            no_telp: (row["No. Telp"] || "").toString().trim(),
            alamat_asal: (row["Alamat Asal"] || "").toString().trim(),
            provinsi: (row["Provinsi"] || "").toString().trim(),
            jenis_baptis: (row["Jenis Baptis"] || "").toString().trim(),
            keterangan_baptis: (row["Keterangan Baptis"] || "").toString().trim(),
            tanggal_masuk: (row["Tanggal Masuk"] || "").toString().trim(),
            tanggal_keluar: (row["Tanggal Atestasi"] || row["Tanggal Keluar"] || "").toString().trim(),
            foto_url: (row["Link Foto"] || "").toString().trim(),
            tenantId: "gpstiaa"
          });
        }

        if (errorMessages.length > 0) {
           const errorText = errorMessages.slice(0, 10).join("\n") + (errorMessages.length > 10 ? `\n...dan ${errorMessages.length - 10} kesalahan lainnya.` : "");
          addToast(`Impor dibatalkan karena ditemukan kesalahan pada data:\n\n${errorText}\n\nSilakan perbaiki file Excel Anda lalu coba lagi.`, "error");
           setIsImporting(false);
           if (fileInputRef.current) fileInputRef.current.value = "";
           return;
        }

        if (validMembers.length === 0) {
          addToast("Tidak ada data yang valid untuk diimpor.", "error");
           setIsImporting(false);
           if (fileInputRef.current) fileInputRef.current.value = "";
           return;
        }

        const chunkSize = 500;
        let importedCount = 0;
        
        for (let i = 0; i < validMembers.length; i += chunkSize) {
          const chunk = validMembers.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          for (const memberData of chunk) {
            const newDocRef = doc(collection(db, "members"));
            batch.set(newDocRef, {
              ...memberData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            importedCount++;
          }
          await batch.commit();
        }
        
        addToast(`Impor data Excel berhasil! ${importedCount} jemaat telah ditambahkan.`, 'success');
      } catch (error) {
        console.error("Error importing:", error);
        addToast("Terjadi kesalahan saat menyimpan data impor Excel ke server.", 'error');
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const term = deferredSearchTerm.toLowerCase();
      const noTelpSafe = m.no_telp || "";
      const alamatSafe = m.alamat_asal || "";
      const noAnggotaSafe = m.nomor_anggota || "";
      
      const matchesSearch = 
        m.nama_lengkap.toLowerCase().includes(term) || 
        noAnggotaSafe.toLowerCase().includes(term) ||
        alamatSafe.toLowerCase().includes(term) ||
        noTelpSafe.toLowerCase().includes(term);
      
      const matchesGender = genderFilter ? m.jenis_kelamin === genderFilter : true;
      const matchesBaptis = baptisFilter ? m.jenis_baptis === baptisFilter : true;
      const matchesStatus = statusFilter === 'Aktif' ? !m.tanggal_keluar : statusFilter === 'Keluar' ? !!m.tanggal_keluar : true;
      
      return matchesSearch && matchesGender && matchesBaptis && matchesStatus;
    }).sort((a, b) => {
      const aNo = a.nomor_anggota || "";
      const bNo = b.nomor_anggota || "";
      
      switch (sortBy) {
        case "nama_asc":
          return a.nama_lengkap.localeCompare(b.nama_lengkap);
        case "nama_desc":
          return b.nama_lengkap.localeCompare(a.nama_lengkap);
        case "no_anggota_asc":
          return (parseInt(aNo.split('/')[0]) || 0) - (parseInt(bNo.split('/')[0]) || 0);
        case "no_anggota_desc":
          return (parseInt(bNo.split('/')[0]) || 0) - (parseInt(aNo.split('/')[0]) || 0);
        case "created_at_desc": {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeB - timeA;
        }
        case "created_at_asc": {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeA - timeB;
        }
        default:
          return 0;
      }
    });
  }, [members, deferredSearchTerm, genderFilter, baptisFilter, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, genderFilter, baptisFilter, statusFilter, sortBy]);

  const birthdayMembers = useMemo(() => {
    return members
      .filter(m => birthdayStatusFilter === 'Aktif' ? !m.tanggal_keluar : birthdayStatusFilter === 'Keluar' ? !!m.tanggal_keluar : true)
      .filter(m => {
        if (!m.tanggal_lahir) return false;
        if (birthdaySubTab === 'bulanIni') {
          const splitDate = m.tanggal_lahir.split('-');
          if (splitDate.length !== 3) return false;
          const bornMonth = parseInt(splitDate[1], 10);
          const currMonth = new Date().getMonth() + 1;
          return bornMonth === currMonth;
        }
        if (birthdaySubTab === 'mingguIni') {
          return isBirthdayInWeek(m.tanggal_lahir, 0);
        }
        if (birthdaySubTab === 'mingguLalu') {
          return isBirthdayInWeek(m.tanggal_lahir, -1);
        }
        if (birthdaySubTab === 'kustom') {
          const splitDate = m.tanggal_lahir.split('-');
          if (splitDate.length !== 3) return false;
          const bornMonth = parseInt(splitDate[1], 10);
          return bornMonth === birthdayCustomMonth;
        }
        return true;
      })
      .map(m => ({ ...m, daysLeft: getDaysToBirthday(m.tanggal_lahir) }))
      .filter(m => m.daysLeft !== null)
      .sort((a, b) => {
        if (birthdaySubTab === 'bulanIni' || birthdaySubTab === 'kustom') {
          const aDay = parseInt(a.tanggal_lahir.split('-')[2] || '0', 10);
          const bDay = parseInt(b.tanggal_lahir.split('-')[2] || '0', 10);
          return aDay - bDay;
        }
        if (birthdaySubTab === 'mingguIni' || birthdaySubTab === 'mingguLalu') {
           const aDateObj = new Date(a.tanggal_lahir);
           const bDateObj = new Date(b.tanggal_lahir);
           const aMonth = aDateObj.getMonth();
           const bMonth = bDateObj.getMonth();
           if (aMonth !== bMonth) return aMonth - bMonth;
           return aDateObj.getDate() - bDateObj.getDate();
        }
        return (a.daysLeft as number) - (b.daysLeft as number);
      });
  }, [members, birthdayStatusFilter, birthdaySubTab, birthdayCustomMonth]);

  const mapData = useMemo(() => {
    let mapMembers = members;
    if (mapStatusFilter === 'aktif') {
      mapMembers = mapMembers.filter(m => !m.tanggal_keluar);
    } else if (mapStatusFilter === 'keluar') {
      mapMembers = mapMembers.filter(m => !!m.tanggal_keluar);
    }
    
    if (mapSearchQuery.trim()) {
      const query = mapSearchQuery.toLowerCase();
      mapMembers = mapMembers.filter(m => m.provinsi && m.provinsi.toLowerCase().includes(query));
    }
    
    const countMap = mapMembers.reduce((acc, m) => {
      if (m.provinsi && m.provinsi.trim() !== '') {
        const groupName = m.provinsi.trim();
        acc[groupName] = (acc[groupName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const entries = Object.entries(countMap);
    if (mapSortBy === 'abjad') {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else {
      entries.sort((a, b) => (b[1] as number) - (a[1] as number));
    }
    return entries;
  }, [members, mapStatusFilter, mapSearchQuery, mapSortBy]);

  const ageChartData = useMemo(() => {
    let anak = 0, remaja = 0, pemuda = 0, dewasa = 0, lansia = 0, tidakDiketahui = 0;
    
    // Consider only active members, or all members? Let's use active members just to be safe,
    // or all members like the gender. Gender uses `members`. I'll use `members`.
    members.forEach(m => {
      if (!m.tanggal_lahir) {
        tidakDiketahui++;
        return;
      }
      
      const parts = m.tanggal_lahir.split('-');
      if (parts.length !== 3) {
        tidakDiketahui++;
        return;
      }
      
      const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const mMonth = today.getMonth() - birthDate.getMonth();
      if (mMonth < 0 || (mMonth === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 0) tidakDiketahui++;
      else if (age <= 12) anak++;
      else if (age <= 17) remaja++;
      else if (age <= 30) pemuda++;
      else if (age <= 59) dewasa++;
      else lansia++;
    });

    return [
      { name: 'Anak (0-12)', value: anak },
      { name: 'Remaja (13-17)', value: remaja },
      { name: 'Pemuda (18-30)', value: pemuda },
      { name: 'Dewasa (31-59)', value: dewasa },
      { name: 'Lansia (60+)', value: lansia },
      { name: 'Tidak Diketahui', value: tidakDiketahui }
    ].filter(item => item.value > 0);
  }, [members]);

  const topProvincesChartData = useMemo(() => {
    const countMap = members.reduce((acc, m) => {
      if (m.provinsi && m.provinsi.trim() !== '') {
        const prov = m.provinsi.trim();
        acc[prov] = (acc[prov] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(countMap).sort((a, b) => (b[1] as number) - (a[1] as number));
    return entries.slice(0, 5).map(e => ({ name: e[0].length > 10 ? e[0].substring(0, 10) + '...' : e[0], value: e[1] }));
  }, [members]);

  const selectedMapAreaMembers = useMemo(() => {
    if (!selectedMapArea) return [];
    return members.filter(m => {
      if (!m.provinsi || m.provinsi.trim() === '' || m.provinsi !== selectedMapArea) return false;
      if (mapStatusFilter === 'aktif' && m.tanggal_keluar) return false;
      if (mapStatusFilter === 'keluar' && !m.tanggal_keluar) return false;
      return true;
    });
  }, [members, selectedMapArea, mapStatusFilter]);

  useEffect(() => {
    if (user?.username === 'BEM') {
      setActiveTab('birthdays');
    } else {
      setActiveTab('overview');
    }
  }, [user]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Automatically close panel on all screens when an option is selected
  };

  const renderNavLinks = () => {
    if (user?.username === 'BEM') {
      return (
        <button 
          onClick={() => handleTabClick("birthdays")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'birthdays' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
        >
          {activeTab === 'birthdays' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Gift className="w-4 h-4" />}
          Ulang Tahun
        </button>
      );
    }

    return (
    <>
      <button 
        onClick={() => handleTabClick("overview")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'overview' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'overview' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <LayoutGrid className="w-4 h-4" />}
        Dashboard Utama
      </button>
      <button 
        onClick={() => handleTabClick("members")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'members' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'members' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Users className="w-4 h-4" />}
        Data Anggota
      </button>
      <button 
        onClick={() => handleTabClick("birthdays")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'birthdays' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'birthdays' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Gift className="w-4 h-4" />}
        Ulang Tahun
      </button>
      <button 
        onClick={() => handleTabClick("reports")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'reports' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'reports' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <UserCheck className="w-4 h-4" />}
        Data Kebaktian
      </button>
      <button 
        onClick={() => handleTabClick("map")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'map' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'map' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <MapPin className="w-4 h-4" />}
        Pemetaan Jemaat
      </button>
      <button 
        onClick={() => handleTabClick("stats")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'stats' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'stats' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <PieChartIcon className="w-4 h-4" />}
        Statistik Jemaat
      </button>
      <div className="w-full h-px bg-white/10 my-1"></div>
      <button 
        onClick={() => handleTabClick("mediarepo")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'mediarepo' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'mediarepo' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Camera className="w-4 h-4" />}
        Galeri Multimedia
      </button>
      <button 
        onClick={() => handleTabClick("documents")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'documents' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'documents' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Folder className="w-4 h-4" />}
        Arsip Dokumen
      </button>
      <button 
        onClick={() => handleTabClick("worship")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'worship' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'worship' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <BookOpen className="w-4 h-4" />}
        Tema Ibadah
      </button>
      <button 
        onClick={() => handleTabClick("misikaltara")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'misikaltara' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'misikaltara' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Globe className="w-4 h-4" />}
        Misi Kaltara
      </button>
      <div className="w-full h-px bg-white/10 my-1"></div>
      
      <button 
        onClick={() => handleTabClick("settings")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'settings' ? 'bg-white/10 text-white font-medium opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'settings' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Settings className="w-4 h-4" />}
        Pengaturan Sistem
      </button>
    </>
  );
  };

  return (
    <div className={`flex h-[100dvh] w-full font-sans text-slate-800 dark:text-slate-100 overflow-hidden bg-slate-50 dark:bg-slate-900 ${isDarkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:relative z-50 bg-slate-900 dark:bg-slate-950 text-white flex-shrink-0 h-full transition-all duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0 w-64 md:w-0"} md:overflow-hidden`}>
        <div className="w-64 p-6 h-full flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="flex gap-1 items-center">
              <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                <img src="https://i.ibb.co.com/HTcTMCcr/GPSTIAA-LOGO-1.png" alt="GPSTIAA" className="h-full w-full object-cover" />
              </div>
              <img src="https://i.ibb.co.com/zHfFFrd1/AA-2-1-2-1.png" alt="STTIAA" className="h-10 w-auto" />
            </div>
            <div>
              <h1 className="text-xs font-bold leading-tight opacity-70 uppercase tracking-widest">Buku Induk</h1>
              <p className="text-sm font-semibold">GPSTTIAA</p>
            </div>
            {/* Mobile close button */}
            <button 
              className="md:hidden ml-auto p-1 text-slate-400 hover:text-white focus:outline-none"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-1 flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
            {renderNavLinks()}
          </nav>
          <div className="mt-auto pt-6 border-t border-white border-opacity-10 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 overflow-hidden">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase shrink-0 overflow-hidden ${user?.username === 'fajrur' ? 'bg-transparent' : 'bg-blue-700'}`}>
                  {user?.username === 'fajrur' ? (
                    <img src={getDirectDriveLink("https://drive.google.com/open?id=1c0e8axpg16CCTf-3dDUbcmnGoNeMqUmv")} alt="Milad Fajrur" className="w-full h-full object-cover" />
                  ) : user?.username === 'anabk' ? 'A' : (user?.username?.[0] || 'U')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium line-clamp-2 break-words" title={user?.username === 'anabk' ? 'Dr. Ana Budi Kristiani, S.Sn., M.M' : (user?.username === 'fajrur' ? 'Milad Fajrur' : user?.username)}>
                    {user?.username === 'anabk' ? 'Dr. Ana Budi Kristiani, S.Sn., M.M' : (user?.username === 'fajrur' ? 'Milad Fajrur' : user?.username)}
                  </p>
                  <p className="text-xs opacity-50 line-clamp-2 break-words mt-0.5">
                    {user?.username === 'fajrur' ? 'Mahasiswa Teologi' : user?.username === 'BEM' ? 'Badan Exclusive Mahasiswa' : user?.username === 'anabk' ? 'Ketua Jemaat' : 'Administrator'}
                  </p>
                </div>
              </div>
              <button onClick={logout} className="p-2 text-red-400 hover:text-red-300 transition-colors focus:outline-none shrink-0" title="Keluar">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-900 w-full">
        <header className="h-auto md:h-16 py-3 md:py-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 shrink-0 gap-3 md:gap-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="p-1.5 md:p-2 -ml-1.5 md:-ml-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg hover:text-slate-800 dark:hover:text-slate-200 transition-colors focus:outline-none"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5 md:w-5 md:h-5" />
            </button>
            <h2 className="font-semibold text-base md:text-lg text-slate-800 dark:text-slate-100 truncate">
              {viewingProfileId && canViewProfile ? "Profil Anggota" : (
                <>
                  {activeTab === 'overview' && "Dashboard Utama"}
                  {activeTab === 'members' && "Data Anggota"}
                  {activeTab === 'birthdays' && "Ulang Tahun Anggota"}
                  {activeTab === 'reports' && "Laporan Mingguan"}
                  {activeTab === 'stats' && "Statistik Jemaat"}
                  {activeTab === 'map' && "Pemetaan Jemaat"}
                  {activeTab === 'mediarepo' && "Galeri Multimedia"}
                  {activeTab === 'documents' && "Arsip Dokumen"}
                  {activeTab === 'worship' && "Tema Ibadah"}
                  {activeTab === 'misikaltara' && "Misi Kaltara"}
                  {activeTab === 'settings' && "Pengaturan Sistem"}
                </>
              )}
            </h2>
          </div>
          
          {viewingProfileId && canViewProfile ? (
            <></>
          ) : (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
              {lastSyncTime && (
                <div 
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-lg shadow-sm" 
                  title={`Terhubung secara real-time. Sinkronisasi terakhir berhasil.`}
                >
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono tracking-tight whitespace-nowrap">
                    {lastSyncTime.toLocaleTimeString('id-ID', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              )}
              <button
                onClick={handleManualSync}
                disabled={isSyncing || isLoading}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                title="Sinkronisasi Manual"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-500' : ''}`} />
                <span className="hidden lg:inline">{isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi'}</span>
              </button>
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={toggleDarkMode}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 md:px-3 md:py-2 rounded-lg transition-all flex items-center justify-center focus:outline-none shadow-sm relative"
                title={isDarkMode ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              >
                {isDarkMode ? <Sun className="h-4 w-4 md:h-4 md:w-4 text-amber-500" /> : <Moon className="h-4 w-4 md:h-4 md:w-4" />}
              </button>

              {/* Birthday Alert for Admin */}
              {(user?.username === 'gpsttiaa' || (!['fajrur', 'anabk', 'BEM'].includes(user?.username || ''))) && notifications.filter(n => n.type === 'birthday').length > 0 && (
                <button
                  onClick={() => handleTabClick('birthdays')}
                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 p-2 md:px-3 md:py-2 rounded-lg transition-all flex items-center justify-center gap-2 focus:outline-none shadow-sm animate-pulse"
                  title="Ada jemaat yang berulang tahun hari ini!"
                >
                  <Gift className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
                  <span className="hidden sm:inline text-xs font-bold whitespace-nowrap">{notifications.filter(n => n.type === 'birthday').length} Ulang Tahun</span>
                </button>
              )}

              {/* Notification Bell */}
              {user?.username !== 'BEM' && (
                <div className="relative notification-container">
                  <button
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 p-2 md:px-3 md:py-2 rounded-lg transition-all flex items-center justify-center focus:outline-none shadow-sm relative"
                  >
                    <Bell className="h-4 w-4 md:h-4 md:w-4" />
                    {notifications.length > 0 && (
                      <span className="absolute top-1.5 right-1.5 md:right-2.5 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-pulse"></span>
                    )}
                  </button>
                  
                  <div className={`absolute right-0 mt-2 w-72 md:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 transition-all duration-200 z-50 transform origin-top-right ${isNotificationOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Pusat Notifikasi</h3>
                      <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">{notifications.length} Baru</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                          <Bell className="h-8 w-8 mx-auto -mt-2 mb-2 opacity-20" />
                          Belum ada notifikasi
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          {notifications.map((notif, idx) => (
                            <div 
                              key={notif.id} 
                              onClick={() => {
                                setIsNotificationOpen(false);
                                const memberToEdit = members.find(m => m.id === notif.memberId);
                                if (memberToEdit && user?.username !== 'BEM') {
                                  setSelectedMember(memberToEdit);
                                  setIsModalOpen(true);
                                } else if (notif.type === 'birthday') {
                                  setActiveTab('birthdays');
                                  setBirthdaySubTab('terdekat'); // Tampilkan yang terdekat
                                } else {
                                  setActiveTab('members');
                                  setSortBy('created_at_desc'); // Urutkan terbaru
                                  setSearchTerm(''); // Bersihkan pencarian jika ada
                                }
                              }}
                              className={`p-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer ${idx === notifications.length - 1 ? 'border-none' : ''}`}
                            >
                              <div className="flex gap-3 items-start">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'birthday' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                  {notif.type === 'birthday' ? <Gift className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{notif.title}</h4>
                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{notif.message}</p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  {notif.type === 'birthday' ? 'Hari ini' : formatDateDDMMYYYY(notif.dateRef)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              )}

              <input
                type="file"
                accept=".xlsx, .xls"
                ref={fileInputRef}
                onChange={handleImportExcel}
                className="hidden"
              />
              
              {user?.username !== 'BEM' && (
                <div className="relative group">
                  <button
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 focus:outline-none shadow-sm"
                  >
                    Opsi Data <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:rotate-180 transition-transform duration-200" />
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right scale-95 group-hover:scale-100">
                    <div className="p-1.5 flex flex-col gap-1">
                      <button
                        onClick={handleDownloadTemplate}
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
                            <Upload className="h-3.5 w-3.5" /> Impor (CSV)
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setIsBulkEntryOpen(true)}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors flex items-center gap-2"
                      >
                        <TableProperties className="h-3.5 w-3.5" /> Input Massal (Grid)
                      </button>
                      <button
                        onClick={() => setIsValidationModalOpen(true)}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-colors flex items-center gap-2"
                      >
                        <AlertCircle className="h-3.5 w-3.5" /> Pemeriksaan Data
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1"></div>
                      <button
                        onClick={handleExportExcel}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors flex items-center gap-2"
                      >
                        <span className="text-sm">📥</span> Unduh Excel
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors flex items-center gap-2"
                      >
                        <span className="text-sm">📄</span> Unduh PDF
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        <div className={`flex-1 flex flex-col overflow-hidden min-h-0 ${activeTab === 'overview' ? '' : 'p-4 sm:p-6 gap-4 sm:gap-6'}`}>
          {viewingProfileId && canViewProfile ? (
            <MemberProfile 
              member={members.find(m => m.id === viewingProfileId)!} 
              onBack={() => setViewingProfileId(null)} 
            />
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewPanel members={members} onNavigate={handleTabClick} user={user} />
              )}
              {activeTab === 'members' && (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden min-h-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 shrink-0">
                    <div 
                      onClick={() => setGenderFilter('')}
                      className={`bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border ${genderFilter === '' ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]'} cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md`}
                    >
                      <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase truncate">Total Anggota</p>
                      <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{members.length}</p>
                    </div>
                <div 
                  onClick={() => setGenderFilter('Pria')}
                  className={`bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border ${genderFilter === 'Pria' ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]'} cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md`}
                >
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase truncate">Jemaat Pria</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{members.filter(m => m.jenis_kelamin === 'Pria').length}</p>
                </div>
                <div 
                  onClick={() => setGenderFilter('Wanita')}
                  className={`bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border ${genderFilter === 'Wanita' ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]'} cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md`}
                >
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase truncate">Jemaat Wanita</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{members.filter(m => m.jenis_kelamin === 'Wanita').length}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 md:p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]">
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium uppercase truncate">Update Terakhir</p>
                  <p className="text-sm md:text-lg font-bold text-blue-900 dark:text-blue-100 mt-0 md:mt-2 truncate">Real-time</p>
                </div>
              </div>

              <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] flex flex-col min-h-0">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 flex flex-row items-center justify-between shrink-0 gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <div className="flex flex-nowrap items-center gap-2 w-max text-xs">
                    <div className="relative group">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        placeholder="Cari nama, nohp, alamat..."
                        className="border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 w-52 md:w-64 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    
                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

                    <select
                      className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none pr-8 cursor-pointer relative"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">Semua Status</option>
                      <option value="Aktif">Jemaat Aktif</option>
                      <option value="Keluar">Atestasi</option>
                    </select>

                    <select
                      className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none pr-8 cursor-pointer relative"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                    >
                      <option value="">Semua Kelamin</option>
                      <option value="Pria">Pria</option>
                      <option value="Wanita">Wanita</option>
                    </select>

                    <select
                      className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none pr-8 cursor-pointer relative"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                      value={baptisFilter}
                      onChange={(e) => setBaptisFilter(e.target.value)}
                    >
                      <option value="">Status Baptis</option>
                      <option value="Baptis Kecil">Baptis Kecil</option>
                      <option value="SIDI">SIDI</option>
                      <option value="Baptis Dewasa">Baptis Dewasa</option>
                    </select>

                    <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 shadow-sm font-medium">
                      <Filter className="w-3 h-3 text-slate-400" />
                      <select
                        className="bg-transparent text-slate-800 dark:text-slate-100 outline-none appearance-none pr-5 cursor-pointer relative"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0 center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                      >
                        <option value="nama_asc">Urut A-Z</option>
                        <option value="nama_desc">Urut Z-A</option>
                        <option value="no_anggota_asc">No. 1-9</option>
                        <option value="no_anggota_desc">No. 9-1</option>
                        <option value="created_at_desc">Terbaru</option>
                        <option value="created_at_asc">Terlama</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-auto flex-1 w-full relative">
                  <table className="w-full text-xs text-left border-collapse whitespace-nowrap min-w-max">
                    <thead className="sticky top-0 bg-white dark:bg-slate-900 shadow-sm z-30 border-b border-slate-200 dark:border-slate-700">
                      <tr className="text-slate-500 dark:text-slate-400 uppercase font-bold bg-white dark:bg-slate-900">
                        <th className="p-3">#</th>
                        <th className="p-3">No. Anggota</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">JK</th>
                        <th className="p-3">TTL / Usia</th>
                        <th className="p-3">No. Telp</th>
                        <th className="p-3">Alamat Asal</th>
                        <th className="p-3">Provinsi</th>
                        <th className="p-3">Jenis Baptis</th>
                        <th className="p-3">Tgl Masuk</th>
                        <th className="p-3">Foto</th>
                        <th className="p-3 text-right print:hidden">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {isLoading ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500 dark:text-slate-400">Memuat data...</td>
                        </tr>
                      ) : filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-slate-500 dark:text-slate-400">Tidak ada data jemaat yang cocok.</td>
                        </tr>
                      ) : (
                        paginatedMembers.map((member, idx) => {
                          const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                          let badgeStyle = "bg-slate-100 text-slate-700";
                          if (member.jenis_baptis === "SIDI") badgeStyle = "bg-blue-100 text-blue-700";
                          else if (member.jenis_baptis === "Baptis Dewasa") badgeStyle = "bg-emerald-100 text-emerald-700";
                          else if (member.jenis_baptis === "Baptis Kecil") badgeStyle = "bg-amber-100 text-amber-700";

                          return (
                            <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                              <td className="p-3 text-slate-700 dark:text-slate-300">{globalIdx}</td>
                              <td className="p-3">
                                {canViewProfile ? (
                                  <button 
                                    onClick={() => {
                                      setMemberToView(member);
                                      setIsViewModalOpen(true);
                                    }}
                                    className="font-mono text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer focus:outline-none text-left"
                                    title="Lihat Detail Kartu Jemaat"
                                  >
                                    {member.nomor_anggota}
                                  </button>
                                ) : (
                                  <span className="font-mono text-slate-700 dark:text-slate-300">
                                    {member.nomor_anggota}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                                <div>
                                  {user?.username !== 'BEM' ? (
                                    <button 
                                      onClick={() => {
                                        setSelectedMember(member);
                                        setIsModalOpen(true);
                                      }}
                                      className="text-left hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none transition-colors"
                                      title="Ketuk untuk Edit Data"
                                    >
                                      {formatNameTitleCase(member.nama_lengkap)}
                                    </button>
                                  ) : (
                                    formatNameTitleCase(member.nama_lengkap)
                                  )}
                                </div>
                                <span className={`inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider ${!member.tanggal_keluar ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>

                                  {!member.tanggal_keluar ? 'Aktif' : 'Atestasi'}
                                </span>
                              </td>
                              <td className="p-3 text-slate-700 dark:text-slate-300">{member.jenis_kelamin === 'Pria' ? 'Pria' : 'Wanita'}</td>
                              <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                <div>{member.tempat_lahir}, {formatDateDDMMYYYY(member.tanggal_lahir)}</div>
                                {member.tanggal_lahir && (() => {
                                   const birthDateObj = new Date(member.tanggal_lahir);
                                   if (isNaN(birthDateObj.getTime())) return null;
                                   const todayDate = new Date();
                                   todayDate.setHours(0, 0, 0, 0);
                                   const nextBirthdayThisYear = new Date(todayDate.getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate());
                                   const hasPassed = nextBirthdayThisYear.getTime() <= todayDate.getTime();
                                   let currentAge = todayDate.getFullYear() - birthDateObj.getFullYear();
                                   if (!hasPassed) currentAge -= 1;
                                   if (currentAge < 0) currentAge = 0;
                                   return (
                                     <span className="inline-block mt-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                                       {currentAge} Tahun
                                     </span>
                                   );
                                })()}
                              </td>
                              <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{member.no_telp || '-'}</td>
                              <td className="p-3 max-w-[150px] truncate text-slate-700 dark:text-slate-300" title={member.alamat_asal}>{member.alamat_asal}</td>
                              <td className="p-3 max-w-[120px] truncate text-slate-700 dark:text-slate-300" title={member.provinsi}>{member.provinsi || '-'}</td>
                              <td className="p-3">
                                {member.jenis_baptis ? (
                                  <span className={`text-[10px] px-2 py-[2px] rounded-full font-semibold uppercase ${badgeStyle}`}>
                                    {member.jenis_baptis}
                                  </span>
                                ) : '-'}
                                {member.keterangan_baptis && (
                                  <>
                                    <br />
                                    <span className="text-[9px] opacity-60">{member.keterangan_baptis}</span>
                                  </>
                                )}
                              </td>
                              <td className="p-3">{formatDateDDMMYYYY(member.tanggal_masuk)}</td>
                              <td className="p-3">
                                {member.foto_url ? (
                                  <a href={member.foto_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700">Link Drive</a>
                                ) : '-'}
                              </td>
                              <td className="p-3 text-right print:hidden">
                                {user?.username !== 'BEM' ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setSelectedMember(member);
                                        setIsModalOpen(true);
                                      }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                      title="Edit Data"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" /> Edit
                                    </button>
                                    <button
                                      onClick={() => member.id && handleDeleteClick(member.id)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
                                      title="Hapus Data"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {(totalPages > 0) && (
                  <div className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMembers.length)} dari {filteredMembers.length} jemaat
                      </span>
                      <select 
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value));
                          setCurrentPage(1); // Reset to first page
                        }}
                        className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={10}>10 baris</option>
                        <option value={50}>50 baris</option>
                        <option value={100}>100 baris</option>
                      </select>
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold focus:outline-none transition-colors"
                        >
                          Sebelumnya
                        </button>
                        
                        {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                          let pageNum = i + 1;
                          if (totalPages > 5 && currentPage > 3) {
                            pageNum = currentPage - 2 + i;
                            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 rounded border text-xs font-semibold focus:outline-none transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold focus:outline-none transition-colors"
                        >
                          Selanjutnya
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <WeeklyReportsPanel />
          )}

          {activeTab === 'birthdays' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] flex flex-col min-h-0">
              <div className="p-4 md:p-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0 relative z-10">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                       <Gift className="text-blue-600 dark:text-blue-400 w-5 h-5"/> Daftar Ulang Tahun
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Pantau jemaat yang berulang tahun pada periode waktu tertentu.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shrink-0">
                      <button
                        onClick={() => setBirthdayView('grid')}
                        className={`p-1.5 rounded-md transition-all ${birthdayView === 'grid' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Tampilan Grid"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setBirthdayView('list')}
                        className={`p-1.5 rounded-md transition-all ${birthdayView === 'list' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title="Tampilan List"
                      >
                        <List className="w-4 h-4" />
                      </button>
                    </div>
                    <select
                      className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm flex-1 sm:w-[150px]"
                      value={birthdayStatusFilter}
                      onChange={(e) => setBirthdayStatusFilter(e.target.value)}
                    >
                      <option value="">Semua Status</option>
                      <option value="Aktif">Anggota Aktif</option>
                      <option value="Keluar">Atestasi</option>
                    </select>
                  </div>
                </div>



              {/* Sub-tabs untuk Bulan Ini vs Terdekat */}
                <div className="flex mt-6 h-10 border-b-2 border-transparent overflow-x-auto whitespace-nowrap scrollbar-hide">
                  <div className="flex space-x-6 h-full px-1">
                    <button
                      onClick={() => setBirthdaySubTab('terdekat')}
                      className={`h-full px-2 text-sm font-medium border-b-2 transition-colors ${birthdaySubTab === 'terdekat' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                      Terdekat
                    </button>
                    <button
                      onClick={() => setBirthdaySubTab('mingguIni')}
                      className={`h-full px-2 text-sm font-medium border-b-2 transition-colors ${birthdaySubTab === 'mingguIni' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                      Minggu Ini
                    </button>
                    <button
                      onClick={() => setBirthdaySubTab('mingguLalu')}
                      className={`h-full px-2 text-sm font-medium border-b-2 transition-colors ${birthdaySubTab === 'mingguLalu' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                      Minggu Lalu
                    </button>
                    <button
                      onClick={() => setBirthdaySubTab('bulanIni')}
                      className={`h-full px-2 text-sm font-medium border-b-2 transition-colors ${birthdaySubTab === 'bulanIni' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                      Bulan Ini
                    </button>
                    <button
                      onClick={() => setBirthdaySubTab('kustom')}
                      className={`h-full px-2 text-sm font-medium border-b-2 transition-colors ${birthdaySubTab === 'kustom' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
                    >
                      Kustom
                    </button>
                  </div>
                </div>
                
                {birthdaySubTab === 'kustom' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Pilih Bulan:</label>
                    <select
                      className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                      value={birthdayCustomMonth}
                      onChange={(e) => setBirthdayCustomMonth(Number(e.target.value))}
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => {
                        const date = new Date(2000, m - 1, 1);
                        return <option key={m} value={m}>{date.toLocaleString('id-ID', { month: 'long' })}</option>
                      })}
                    </select>
                  </div>
                )}
              </div>
              
              <div className={`flex-1 w-full bg-slate-50/50 dark:bg-slate-900/50 flex flex-col min-h-0 ${birthdayView === 'grid' ? 'p-3 sm:p-4 md:p-6 overflow-auto' : 'overflow-hidden'}`}>
                {birthdayView === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                    {birthdayMembers
                      .map((m) => {
                        const days = m.daysLeft as number;
                      const isToday = days === 0;
                      const isUpcoming = days > 0 && days <= 7;
                      const isActive = !m.tanggal_keluar;
                      
                      let cardStyle = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm";
                      let badgeStyle = "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
                      let iconColor = "text-slate-500 dark:text-slate-400";
                      let iconBg = "bg-slate-100 dark:bg-slate-700/50";
                      
                      if (isToday) {
                        cardStyle = "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-blue-100/50 dark:shadow-none ring-1 ring-blue-500 dark:ring-blue-600";
                        badgeStyle = "bg-blue-600 dark:bg-blue-500 text-white animate-pulse shadow-sm";
                        iconColor = "text-blue-600 dark:text-blue-400";
                        iconBg = "bg-blue-100 dark:bg-blue-900/50";
                      } else if (isUpcoming) {
                        cardStyle = "bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50";
                        badgeStyle = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold";
                        iconColor = "text-emerald-500 dark:text-emerald-400";
                      }
                      
                      const birthDateObj = new Date(m.tanggal_lahir);
                      const todayDate = new Date();
                      todayDate.setHours(0, 0, 0, 0);
                      const nextBirthdayThisYear = new Date(todayDate.getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate());
                      const hasPassed = nextBirthdayThisYear.getTime() <= todayDate.getTime();
                      let currentAge = todayDate.getFullYear() - birthDateObj.getFullYear();
                      if (!hasPassed) currentAge -= 1;
                      if (currentAge < 0) currentAge = 0;
                      
                      const upcomingBirthday = new Date(nextBirthdayThisYear);
                      if (upcomingBirthday.getTime() < todayDate.getTime() && !(isToday)) {
                          upcomingBirthday.setFullYear(todayDate.getFullYear() + 1);
                      }
                      
                      const displayDate = `${upcomingBirthday.toLocaleDateString('id-ID', { weekday: 'long' })}, ${formatDateDDMMYYYY(m.tanggal_lahir)}`;

                      const nextAge = currentAge + 1;

                      return (
                        <div 
                          key={m.id} 
                          onClick={() => canViewProfile && setViewingProfileId(m.id)}
                          className={`p-4 sm:p-5 rounded-xl border transition-all ${cardStyle} flex flex-col relative overflow-hidden h-full ${canViewProfile ? 'hover:shadow-md hover:-translate-y-1 cursor-pointer' : ''}`}
                        >
                           {/* Decorative gift icon */}
                           {isToday ? (
                             <div className="absolute -top-6 -right-6 text-blue-100 dark:text-blue-900/30 opacity-50 rotate-12 pointer-events-none">
                               <Gift size={100} />
                             </div>
                           ) : isUpcoming ? (
                             <div className="absolute -top-6 -right-6 text-emerald-100 dark:text-emerald-900/20 opacity-50 rotate-12 pointer-events-none">
                               <Gift size={100} />
                             </div>
                           ) : null}

                           {/* Remaining days bold badge at top-right inside */}
                           <div className="absolute top-0 right-0 p-3 flex flex-col items-end">
                             {isToday ? (
                               <div className="bg-blue-600 text-white animate-pulse px-3 py-1 rounded-bl-xl rounded-tr-lg font-black text-xs sm:text-sm tracking-wide shadow-md flex items-center justify-center -mr-0.5 -mt-0.5">
                                 HARI INI! 🎉
                               </div>
                             ) : (
                               <div className="flex flex-col items-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm rounded-lg px-3 py-1.5 min-w-[3.5rem] mt-1 mr-1">
                                 <span className="font-black text-lg sm:text-xl text-slate-800 dark:text-slate-100 leading-none">{days}</span>
                                 <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight mt-0.5">Hari</span>
                               </div>
                             )}
                           </div>
                           
                           <div className="flex justify-between items-start mb-4 relative z-10 gap-2 sm:gap-3 mt-4">
                             <div className="flex-1 min-w-0 space-y-1 pr-16 sm:pr-20">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-[14px] sm:text-[15px] md:text-base leading-snug line-clamp-2 break-words" title={formatNameTitleCase(m.nama_lengkap)}>
                                    {formatNameTitleCase(m.nama_lengkap)}
                                  </h3>
                                  {user?.username !== 'BEM' && m.nomor_anggota && (
                                    <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap self-start mt-0.5">
                                      {m.nomor_anggota}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center mt-1">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                    {isActive ? 'Aktif' : 'Atestasi'}
                                  </span>
                                </div>
                             </div>
                           </div>
                           
                           <div className="mt-auto flex flex-col gap-3 relative z-10">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 ${!m.foto_url ? iconBg : 'bg-slate-200 dark:bg-slate-700'} ${iconColor} relative overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm`}>
                                  {m.foto_url && (
                                    <img
                                      src={getDirectDriveLink(m.foto_url)}
                                      alt={m.nama_lengkap}
                                      className="w-full h-full object-cover absolute inset-0"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  {!m.foto_url && <Gift className="w-5 h-5" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-slate-700 dark:text-slate-200">
                                    <span>{displayDate}</span> 
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Usia saat ini <span className="font-bold text-slate-700 dark:text-slate-200">{currentAge}</span> thn
                                    <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
                                    Mendatang <span className="font-bold text-indigo-600 dark:text-indigo-400">{nextAge}</span> thn
                                  </div>
                                </div>
                              </div>
                           </div>
                        </div>
                      );
                  })}
                  
                  {birthdayMembers.length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                       <Gift className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                       <p>{birthdaySubTab === 'bulanIni' ? 'Tidak ada jemaat yang berulang tahun pada bulan ini.' : birthdaySubTab === 'mingguIni' ? 'Tidak ada jemaat yang berulang tahun pada minggu ini.' : birthdaySubTab === 'mingguLalu' ? 'Tidak ada jemaat yang berulang tahun pada minggu lalu.' : 'Belum ada data tanggal lahir yang valid untuk ditampilkan.'}</p>
                     </div>
                  )}
                </div>
                ) : (
                  <div className="bg-white dark:bg-slate-800 m-0 sm:m-4 md:m-6 sm:rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-0 shadow-sm relative overflow-hidden">
                    <div className="overflow-auto flex-1 h-full">
                      <table className="w-full text-left border-collapse text-sm whitespace-nowrap min-w-full">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
                          <tr>
                            <th className="p-3 sm:p-4 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">Jemaat</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900">Tanggal Lahir</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell bg-slate-50 dark:bg-slate-900">Usia Saat Ini</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 hidden sm:table-cell bg-slate-50 dark:bg-slate-900">Usia Mendatang</th>
                            <th className="p-3 font-semibold text-slate-600 dark:text-slate-300 text-center bg-slate-50 dark:bg-slate-900">Hitung Mundur</th>
                          </tr>
                        </thead>
                        <tbody>
                          {birthdayMembers
                            .map((m) => {
                              const days = m.daysLeft as number;
                              const isToday = days === 0;
                              const isActive = !m.tanggal_keluar;
                              const birthDateObj = new Date(m.tanggal_lahir);
                              const displayDate = `${birthDateObj.toLocaleDateString('id-ID', { weekday: 'long' })}, ${formatDateDDMMYYYY(m.tanggal_lahir)}`;
                              const todayDate = new Date();
                              todayDate.setHours(0, 0, 0, 0);
                              const nextBirthdayThisYear = new Date(todayDate.getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate());
                              const hasPassed = nextBirthdayThisYear.getTime() <= todayDate.getTime();
                              let currentAge = todayDate.getFullYear() - birthDateObj.getFullYear();
                              if (!hasPassed) currentAge -= 1;
                              if (currentAge < 0) currentAge = 0;
                              const nextAge = currentAge + 1;

                              return (
                                <tr 
                                  key={m.id} 
                                  onClick={() => canViewProfile && setViewingProfileId(m.id)}
                                  className={`border-b border-slate-100 dark:border-slate-800/50 transition-colors ${canViewProfile ? 'hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer' : ''} ${isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                >
                                  <td className="p-3 sm:p-4">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isToday ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 border border-slate-200 dark:border-slate-600'} relative overflow-hidden`}>
                                        {m.foto_url && (
                                           <img
                                             src={getDirectDriveLink(m.foto_url)}
                                             alt={m.nama_lengkap}
                                             className="w-full h-full object-cover absolute inset-0"
                                             onError={(e) => {
                                               e.currentTarget.style.display = 'none';
                                             }}
                                           />
                                        )}
                                        {!m.foto_url && <Gift className="w-5 h-5" />}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={`font-semibold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'} break-words line-clamp-1`} title={formatNameTitleCase(m.nama_lengkap)}>
                                            {formatNameTitleCase(m.nama_lengkap)} {isToday && '🎉'}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {user?.username !== 'BEM' && m.nomor_anggota && (
                                            <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                              {m.nomor_anggota}
                                            </span>
                                          )}
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                            {isActive ? 'Aktif' : 'Atestasi'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                                    {displayDate}
                                    <div className="text-xs text-slate-500 dark:text-slate-400 sm:hidden mt-0.5">Saat ini: {currentAge} / Nanti: {nextAge} thn</div>
                                  </td>
                                  <td className="p-3 text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{currentAge}</span> Tahun
                                  </td>
                                  <td className="p-3 text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{nextAge}</span> Tahun
                                  </td>
                                  <td className="p-3 text-center">
                                    {isToday ? (
                                      <span className="px-3 py-1 rounded bg-blue-600 text-white font-bold animate-pulse text-xs shadow-sm inline-block min-w-[5rem]">
                                        HARI INI!
                                      </span>
                                    ) : (
                                      <span className="px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-600 shadow-sm text-sm inline-block min-w-[5rem]">
                                        {days} Hari
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                          })}
                          {birthdayMembers.length === 0 && (
                             <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                  {birthdaySubTab === 'bulanIni' ? 'Tidak ada jemaat yang berulang tahun pada bulan ini.' : birthdaySubTab === 'mingguIni' ? 'Tidak ada jemaat yang berulang tahun pada minggu ini.' : birthdaySubTab === 'mingguLalu' ? 'Tidak ada jemaat yang berulang tahun pada minggu lalu.' : 'Belum ada data tanggal lahir yang valid untuk ditampilkan.'}
                                </td>
                             </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] p-4 sm:p-6 overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6">Statistik Jemaat</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 text-center mb-4 uppercase tracking-wider">Demografi Kelamin</h3>
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Pria', value: members.filter(m => m.jenis_kelamin === 'Pria').length },
                            { name: 'Wanita', value: members.filter(m => m.jenis_kelamin === 'Wanita').length },
                          ]}
                          cx="50%" cy="50%" innerRadius={isSidebarOpen && window.innerWidth < 1024 ? 40 : 60} outerRadius={isSidebarOpen && window.innerWidth < 1024 ? 60 : 80} paddingAngle={5} dataKey="value"
                          isAnimationActive={true} animationDuration={1500} animationEasing="ease-out"
                        >
                          <Cell fill="#1E3A8A" />
                          <Cell fill="#10B981" />
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#1e293b' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#1E3A8A]"></span>Pria</div>
                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>Wanita</div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 text-center mb-4 uppercase tracking-wider">Demografi Usia</h3>
                  <div className="h-56 sm:h-64 -ml-4 sm:-ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ageChartData}>
                        <XAxis dataKey="name" tick={{fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b'}} interval={0} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} width={35} />
                        <Tooltip cursor={{fill: isDarkMode ? '#334155' : '#f1f5f9'}} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#1e293b' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out">
                          {ageChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', '#F97316', '#94A3B8'][index % 6]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 text-center mb-4 uppercase tracking-wider">Statistik Berdasarkan Provinsi</h3>
                  <div className="h-56 sm:h-64 -ml-4 sm:-ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProvincesChartData}>
                        <XAxis dataKey="name" tick={{fontSize: 9, fill: isDarkMode ? '#94a3b8' : '#64748b'}} interval={0} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} width={35} />
                        <Tooltip cursor={{fill: isDarkMode ? '#334155' : '#f1f5f9'}} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#1e293b' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out">
                          {topProvincesChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 text-center mb-4 uppercase tracking-wider">Status Keanggotaan</h3>
                  <div className="h-56 sm:h-64 -ml-4 sm:-ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Aktif', value: members.filter(m => !m.tanggal_keluar).length },
                        { name: 'Atestasi', value: members.filter(m => m.tanggal_keluar).length }
                      ]}>
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} interval={0} />
                        <YAxis tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} width={35} />
                        <Tooltip cursor={{fill: isDarkMode ? '#334155' : '#f1f5f9'}} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#1e293b' }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          <Cell fill="#10B981" />
                          <Cell fill="#EF4444" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] p-4 sm:p-6 flex flex-col min-h-0 relative overflow-hidden">
               {selectedMapArea ? (
                 <div className="flex flex-col h-full absolute inset-0 bg-white dark:bg-slate-800 p-4 sm:p-6 z-10 animate-in fade-in zoom-in-95 duration-200">
                   <div className="flex items-center gap-3 mb-4 sm:mb-6 shrink-0">
                     <button onClick={() => setSelectedMapArea(null)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors focus:outline-none">
                       <ArrowLeft className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                     </button>
                     <div>
                       <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">Jemaat Area: {selectedMapArea}</h2>
                       <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Total {selectedMapAreaMembers.length} Anggota</p>
                     </div>
                   </div>
                   <div className="flex-1 overflow-y-auto pr-2">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {selectedMapAreaMembers.map(m => (
                          <div 
                            key={m.id} 
                            onClick={() => { if(canViewProfile) { setViewingProfileId(m.id); } }} 
                            className={`flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl ${canViewProfile ? 'hover:shadow-md cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all' : ''}`}
                          >
                             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center relative overflow-hidden font-bold">
                               {m.foto_url ? (
                                  <img src={getDirectDriveLink(m.foto_url)} alt={m.nama_lengkap} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                               ) : (
                                  <span className="text-slate-500 dark:text-slate-400">{m.nama_lengkap.charAt(0).toUpperCase()}</span>
                               )}
                             </div>
                             <div className="min-w-0">
                               <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">{formatNameTitleCase(m.nama_lengkap)}</p>
                               <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">{m.provinsi || m.alamat_asal || 'Lainnya'}</p>
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                 </div>
               ) : (
                 <>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6 shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">Pemetaan Jemaat Berdasarkan Provinsi Asal</h2>
                    <div className="flex flex-wrap items-center gap-2">
                       <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Cari provinsi..." 
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-40 text-slate-800 dark:text-slate-100"
                            value={mapSearchQuery}
                            onChange={(e) => setMapSearchQuery(e.target.value)}
                          />
                       </div>
                       <select 
                         className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                         value={mapStatusFilter}
                         onChange={(e) => setMapStatusFilter(e.target.value as any)}
                       >
                         <option value="semua">Semua Data</option>
                         <option value="aktif">Aktif</option>
                         <option value="keluar">Keluar</option>
                       </select>
                       <select 
                         className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                         value={mapSortBy}
                         onChange={(e) => setMapSortBy(e.target.value as any)}
                       >
                         <option value="abjad">Abjad (A-Z)</option>
                         <option value="jumlah">Jml Terbanyak</option>
                       </select>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2">
                    {mapData.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {mapData.map(([group, count]) => (
                          <div key={group} onClick={() => setSelectedMapArea(group)} className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer group">
                            <div className="min-w-0 pr-3">
                              <p className="font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={group}>{group}</p>
                              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Area/Wilayah</p>
                            </div>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-xs sm:text-sm group-hover:scale-110 transition-transform">
                              {count}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Tidak ada data provinsi yang sesuai dengan filter.</p>
                      </div>
                    )}
                  </div>
                 </>
               )}
            </div>
          )}

          {activeTab === 'mediarepo' && <MediaRepoPanel />}
          {activeTab === 'documents' && <DocumentPanel />}
          {activeTab === 'worship' && <WorshipThemePanel />}
          {activeTab === 'misikaltara' && <MisiKaltaraPanel />}

          {activeTab === 'settings' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] p-6 overflow-y-auto">
              <div className="max-w-xl mx-auto space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Pengaturan Sistem</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Kelola preferensi akun dan aplikasi Buku Induk GPSTTIAA.</p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Informasi Akun</h3>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Nama Pengguna</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 break-words" title={user?.username === 'anabk' ? 'Dr. Ana Budi Kristiani, S.Sn., M.M' : (user?.username === 'fajrur' ? 'Milad Fajrur' : user?.username)}>
                        {user?.username === 'anabk' ? 'Dr. Ana Budi Kristiani, S.Sn., M.M' : (user?.username === 'fajrur' ? 'Milad Fajrur' : user?.username)}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-full w-max shrink-0">
                      {user?.username === 'fajrur' ? 'Mahasiswa Teologi' : user?.username === 'BEM' ? 'Badan Exclusive Mahasiswa' : user?.username === 'anabk' ? 'Ketua Jemaat' : 'Administrator'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Data Organisasi</h3>
                  <div className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Nama Ketua Jemaat</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Nama ini akan ditampilkan pada titi mangsa Kartu Jemaat yang diunduh</p>
                    </div>
                    <input 
                      type="text" 
                      value={ketuaJemaat}
                      readOnly
                      className="mt-1 block w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 cursor-not-allowed focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Sistem Eksternal</h3>
                  <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Status Sinkronisasi Firebase</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Database Firestore Real-time</p>
                    </div>
                    <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Terhubung
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Penggunaan Penyimpanan</h3>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">Kapasitas Dokumen (Firestore)</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Penggunaan limit data aplikasi</p>
                      </div>
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                        <PieChartIcon className="w-5 h-5" />
                      </div>
                    </div>
                    {dbStats.loading ? (
                       <p className="text-sm text-slate-500 dark:text-slate-400 italic">Mengambil data penggunaan...</p>
                    ) : (
                      <>
                        <div className="mb-2 flex justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                          <span>{((dbStats.membersCount + dbStats.reportsCount) || 0).toLocaleString()} Indeks <span className="text-xs text-slate-500 ml-1">({(((dbStats.membersCount + dbStats.reportsCount) / 50000) * 100).toFixed(2)}%)</span></span>
                          <span>Batas Aman: 50.000</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-4 overflow-hidden flex">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(((dbStats.membersCount + dbStats.reportsCount) / 50000) * 100, 100)}%` }}></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                           <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Data Jemaat</p>
                              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">{dbStats.membersCount.toLocaleString()} <span className="text-xs font-normal text-slate-500">anggota</span></p>
                           </div>
                           <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Kalkulasi Memori</p>
                              <p className="text-lg font-bold text-slate-700 dark:text-slate-200">~{(((dbStats.membersCount + dbStats.reportsCount) * 1.5) / 1024).toFixed(2)} <span className="text-xs font-normal text-slate-500">MB</span></p>
                           </div>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
                          Sistem saat ini mengalokasikan <span className="font-semibold text-slate-700 dark:text-slate-300">{(50000 - (dbStats.membersCount + dbStats.reportsCount)).toLocaleString()} ruang data kosong</span>. 
                          Estimasi penggunaan memori didasarkan pada ~1.5KB per catatan/dokumen di database Firebase.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </>
          )}
        </div>
        <div className="text-center p-3 text-xs font-medium text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 w-full z-10 transition-colors">
          Kontak: <a href="mailto:gpsttiaa@gmail.com" className="text-blue-500 hover:underline">gpsttiaa@gmail.com</a> | Bank: <span className="font-mono bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">614-055-5795</span> an. Ana Budi Kristiani
        </div>
      </main>

      <MemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedMember}
        onSave={handleSaveMember}
        members={members}
      />
      
      <MemberViewModal
        isOpen={isViewModalOpen && canViewProfile}
        onClose={() => setIsViewModalOpen(false)}
        member={memberToView}
        ketuaJemaat={ketuaJemaat}
      />

      <BulkEntryModal
        isOpen={isBulkEntryOpen}
        onClose={() => setIsBulkEntryOpen(false)}
        onSuccess={(count) => {
          addToast(`Input massal berhasil! ${count} jemaat baru ditambahkan.`, 'success');
        }}
        members={members}
      />

      <DataValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        members={members}
        onEditMember={(member) => {
          setSelectedMember(member);
          setIsModalOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Konfirmasi Penghapusan</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Apakah Anda yakin ingin menghapus data jemaat <strong>{formatNameTitleCase(members.find(m => m.id === memberToDelete)?.nama_lengkap)}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMemberToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors focus:outline-none"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors focus:outline-none shadow-sm"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Greeting Modal */}
      {greetingMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] max-w-lg w-full p-10 sm:p-12 text-center flex flex-col items-center animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-700">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <span className="text-4xl">👋</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-slate-800 dark:text-slate-100 mb-6 leading-snug">
              <span className="opacity-90">{greetingMessage.split(' ').slice(0, 2).join(' ')}</span>
              <br />
              <span className="font-semibold text-blue-700 dark:text-blue-400">{greetingMessage.split(' ').slice(2).join(' ')}</span>
            </h2>

            {(() => {
              const bdays = members.filter(m => getDaysToBirthday(m.tanggal_lahir) === 0 && !m.tanggal_keluar);
              if (bdays.length === 0) return null;
              
              return (
                <div className="w-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 mb-8 animate-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Gift className="w-6 h-6 text-amber-500 animate-bounce" />
                    <h3 className="text-lg font-bold text-amber-800 dark:text-amber-400">Selamat Ulang Tahun!</h3>
                  </div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-3">
                    Hari ini ada jemaat yang berulang tahun:
                  </p>
                  <div className="flex flex-col gap-2">
                    {bdays.map(m => {
                      const todayDate = new Date();
                      const birthDateObj = new Date(m.tanggal_lahir!);
                      const age = todayDate.getFullYear() - birthDateObj.getFullYear();
                      return (
                        <div key={m.id} className="bg-white/60 dark:bg-slate-800/60 rounded-xl py-2 px-3 flex items-center justify-center gap-2 font-semibold text-amber-900 dark:text-amber-100">
                          <span className="truncate max-w-[200px] sm:max-w-[250px]">{formatNameTitleCase(m.nama_lengkap)}</span>
                          <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-700/50 text-amber-800 dark:text-amber-200 rounded-full text-xs shrink-0">
                            Ke-{age}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <button
              onClick={() => setGreetingMessage(null)}
              className="w-full sm:w-auto px-12 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all hover:scale-105 active:scale-95 focus:outline-none shadow-lg shadow-blue-600/30 tracking-wide"
            >
              Oke, Lanjutkan
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button for Add Data */}
      {activeTab === 'members' && user?.username !== 'BEM' && (
        <button
          onClick={() => {
            setSelectedMember(undefined);
            setIsModalOpen(true);
          }}
          className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[60] bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-[0_8px_25px_rgba(37,99,235,0.4)] hover:shadow-[0_12px_35px_rgba(37,99,235,0.5)] transform hover:-translate-y-1 active:scale-95 transition-all duration-300 flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-blue-500/30"
          title="Tambah Data Jemaat"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300" />
        </button>
      )}
    </div>
  );
}
