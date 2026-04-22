import React, { useState, useEffect, useRef, useMemo } from "react";
import { collection, onSnapshot, query, setDoc, doc, deleteDoc, serverTimestamp, orderBy, where } from "firebase/firestore";
import Papa from "papaparse";
import { Download, Plus, Search, LogOut, Edit2, Trash2, Filter, Users, PieChart as PieChartIcon, MapPin, Settings, Upload, Menu, UserCheck, CheckCircle, AlertCircle, Info, X, ChevronDown, MoreVertical, Gift, Bell, Eye, TableProperties } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import { db } from "../lib/firebase";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import { Member } from "../types";
import { formatDateDDMMYYYY } from "../lib/utils";
import MemberModal from "./MemberModal";
import MemberViewModal from "./MemberViewModal";
import BulkEntryModal from "./BulkEntryModal";
import WeeklyReportsPanel from "./WeeklyReportsPanel";

export type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };
  const isInitialLoad = useRef(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>(undefined);
  
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [memberToView, setMemberToView] = useState<Member | null>(null);

  const [isBulkEntryOpen, setIsBulkEntryOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("members"); // "members", "stats", "map", "settings"
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [baptisFilter, setBaptisFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // Default to "Semua Status"
  const [birthdayStatusFilter, setBirthdayStatusFilter] = useState("Aktif"); // Default to "Aktif" for Birthdays
  const [sortBy, setSortBy] = useState("nama_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Get Days to Birthday Helper
  const getDaysToBirthday = (birthDateStr: string) => {
    if (!birthDateStr) return null;
    const bDate = new Date(birthDateStr);
    if (isNaN(bDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
    
    if (nextBday.getTime() < today.getTime()) {
      nextBday.setFullYear(today.getFullYear() + 1);
    }
    
    // Check if it was exactly a leap year birthday that we should push to Mar 1 if not a leap year. JS Date handles Feb 29 on non-leap years as Mar 1.
    
    const diffTime = nextBday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  
  const hasNotifiedBirthdays = useRef(false);

  useEffect(() => {
    if (members.length > 0 && !hasNotifiedBirthdays.current && !isLoading) {
      const todayBirthdays = members.filter(m => getDaysToBirthday(m.tanggal_lahir) === 0);
      if (todayBirthdays.length > 0) {
        const names = todayBirthdays.map(m => m.nama_lengkap).join(', ');
        addToast(`🎉 Hari ini ulang tahun: ${names}!\nSelamat Ulang Tahun!`, 'info');
        hasNotifiedBirthdays.current = true;
      }
    }
  }, [members, isLoading]);

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
          type: 'birthday',
          title: 'Ulang Tahun Hari Ini!',
          message: `${m.nama_lengkap} berulang tahun hari ini.🎉`,
          dateRef: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0).getTime() // Virtual 7 AM
        });
      }
    });

    // 2. Recent additions (top 5)
    members
      .slice()
      .filter(m => m.createdAt)
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      })
      .slice(0, 5)
      .forEach(m => {
        const time = m.createdAt?.toMillis ? m.createdAt.toMillis() : (m.createdAt?.seconds ? m.createdAt.seconds * 1000 : 0);
        if (time > 0) {
          notifs.push({
            id: `new-${m.id}`,
            type: 'new_data',
            title: 'Data Berhasil Diinput',
            message: `Data jemaat ${m.nama_lengkap} telah ditambahkan ke sistem.`,
            dateRef: time
          });
        }
      });

    return notifs.sort((a, b) => b.dateRef - a.dateRef);
  }, [members, getDaysToBirthday]);

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
      if (user.username === "gpsttiaa") message = `Selamat ${time} admin GPSTTIAA`;
      else if (user.username === "fajrur") message = `Selamat ${time} Fajrur`;
      else if (user.username === "anabk") message = `Selamat ${time} Dr. Ana Budi Kristiani, S.Sn., M.M`;

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

  const handleSaveMember = async (memberData: Member) => {
    const { id, ...dataToSave } = memberData;
    const docId = id || doc(collection(db, "members")).id;
    const isNew = !id;
    
    // Scrub undefined fields to prevent Firestore crash
    const cleanData = Object.fromEntries(
      Object.entries(dataToSave).filter(([_, v]) => v !== undefined)
    );

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

  const handleExportCSV = () => {
    const csvData = members.map((m, index) => ({
      "No": index + 1,
      "Nomor Anggota": m.nomor_anggota,
      "Nama Lengkap": m.nama_lengkap,
      "Jenis Kelamin": m.jenis_kelamin,
      "Tempat Lahir": m.tempat_lahir,
      "Tanggal Lahir": m.tanggal_lahir,
      "No. Telp": m.no_telp || "-",
      "Alamat Asal": m.alamat_asal,
      "Jenis Baptis": m.jenis_baptis,
      "Keterangan Baptis": m.keterangan_baptis,
      "Tanggal Masuk": m.tanggal_masuk,
      "Tanggal Keluar": m.tanggal_keluar,
      "Link Foto": m.foto_url
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'Buku_Induk_GPSTIAA.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      "Nomor Anggota": "1",
      "Nama Lengkap": "Nama Contoh",
      "Jenis Kelamin": "Pria",
      "Tempat Lahir": "Jakarta",
      "Tanggal Lahir": "1990-01-01",
      "No. Telp": "081234567890",
      "Alamat Asal": "Jl. Contoh Alamat No. 123",
      "Jenis Baptis": "Baptis Dewasa",
      "Keterangan Baptis": "Contoh keterangan (bisa dikosongkan)",
      "Tanggal Masuk": "2023-01-01",
      "Tanggal Keluar": "",
      "Link Foto": ""
    }];
    
    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'Template_Impor_Jemaat.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const validMembers: Member[] = [];
          const existingNomor = new Set(members.map(m => m.nomor_anggota).filter(n => n));
          const currentCsvNomor = new Set<string>();
          const errorMessages: string[] = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // +1 zero-index, +1 header row
            
            const nomor_anggota = (row["Nomor Anggota"] || "").toString().trim();
            const nama_lengkap = (row["Nama Lengkap"] || "").toString().trim();
            const jenis_kelamin = (row["Jenis Kelamin"] || "").toString().trim();
            
            if (!nomor_anggota || !nama_lengkap || !jenis_kelamin) {
               errorMessages.push(`Baris ${rowNum}: Kolom "Nomor Anggota", "Nama Lengkap", dan "Jenis Kelamin" wajib diisi.`);
               continue;
            }

            if (existingNomor.has(nomor_anggota)) {
              errorMessages.push(`Baris ${rowNum}: Nomor Anggota '${nomor_anggota}' sudah terdaftar di sistem.`);
              continue;
            }

            if (currentCsvNomor.has(nomor_anggota)) {
              errorMessages.push(`Baris ${rowNum}: Nomor Anggota '${nomor_anggota}' duplikat di dalam baris CSV.`);
              continue;
            }

            currentCsvNomor.add(nomor_anggota);

            const memberData: Member = {
              nomor_anggota,
              nama_lengkap,
              jenis_kelamin: (jenis_kelamin === "Pria" || jenis_kelamin === "Wanita") ? jenis_kelamin : "",
              tempat_lahir: row["Tempat Lahir"] || "",
              tanggal_lahir: row["Tanggal Lahir"] || "",
              no_telp: row["No. Telp"] || "",
              alamat_asal: row["Alamat Asal"] || "",
              jenis_baptis: row["Jenis Baptis"] || "",
              keterangan_baptis: row["Keterangan Baptis"] || "",
              tanggal_masuk: row["Tanggal Masuk"] || "",
              tanggal_keluar: row["Tanggal Keluar"] || "",
              foto_url: row["Link Foto"] || "",
              tenantId: "gpstiaa"
            };

            validMembers.push(memberData);
          }

          if (errorMessages.length > 0) {
             const errorText = errorMessages.slice(0, 10).join("\n") + (errorMessages.length > 10 ? `\n...dan ${errorMessages.length - 10} kesalahan lainnya.` : "");
             alert(`Impor dibatalkan karena ditemukan kesalahan pada data:\n\n${errorText}\n\nSilakan perbaiki file CSV Anda lalu coba lagi.`);
             setIsImporting(false);
             if (fileInputRef.current) fileInputRef.current.value = "";
             return;
          }

          if (validMembers.length === 0) {
             alert("Tidak ada data yang valid untuk diimpor.");
             setIsImporting(false);
             if (fileInputRef.current) fileInputRef.current.value = "";
             return;
          }

          let importedCount = 0;
          for (const memberData of validMembers) {
            const docId = doc(collection(db, "members")).id;
            await setDoc(doc(db, "members", docId), {
              ...memberData,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            importedCount++;
          }
          addToast(`Impor data CSV berhasil! ${importedCount} jemaat telah ditambahkan.`, 'success');
        } catch (error) {
          console.error("Error importing:", error);
          addToast("Terjadi kesalahan saat menyimpan data impor ke server.", 'error');
        } finally {
          setIsImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error) => {
        console.error("CSV Parse Error:", error);
        addToast("Gagal mengurai dan membaca file CSV.", 'error');
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const term = searchTerm.toLowerCase();
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
        case "tgl_masuk_desc":
          return new Date(b.tanggal_masuk || 0).getTime() - new Date(a.tanggal_masuk || 0).getTime();
        case "tgl_masuk_asc":
          return new Date(a.tanggal_masuk || 0).getTime() - new Date(b.tanggal_masuk || 0).getTime();
        default:
          return 0;
      }
    });
  }, [members, searchTerm, genderFilter, baptisFilter, statusFilter, sortBy]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = useMemo(() => {
    return filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, genderFilter, baptisFilter, statusFilter, sortBy]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const renderNavLinks = () => (
    <>
      <button 
        onClick={() => handleTabClick("members")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'members' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'members' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Users className="w-4 h-4" />}
        Data Anggota
      </button>
      <button 
        onClick={() => handleTabClick("birthdays")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'birthdays' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'birthdays' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Gift className="w-4 h-4" />}
        Ulang Tahun
      </button>
      <button 
        onClick={() => handleTabClick("reports")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'reports' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'reports' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <UserCheck className="w-4 h-4" />}
        Data Kebaktian
      </button>
      <button 
        onClick={() => handleTabClick("stats")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'stats' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'stats' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <PieChartIcon className="w-4 h-4" />}
        Statistik Jemaat
      </button>
      <button 
        onClick={() => handleTabClick("map")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'map' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'map' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <MapPin className="w-4 h-4" />}
        Pemetaan Jemaat
      </button>
      <button 
        onClick={() => handleTabClick("settings")}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all focus:outline-none ${activeTab === 'settings' ? 'bg-white bg-opacity-10 opacity-100' : 'opacity-60 hover:opacity-100'}`}
      >
        {activeTab === 'settings' ? <span className="w-2 h-2 rounded-full bg-blue-400"></span> : <Settings className="w-4 h-4" />}
        Pengaturan Sistem
      </button>
    </>
  );

  return (
    <div className={`flex h-screen w-full font-sans text-slate-800 dark:text-slate-100 overflow-hidden bg-slate-50 dark:bg-slate-900 ${isDarkMode ? 'dark' : ''}`}>
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
            <div className="bg-white p-1 rounded-md">
              <img src="https://i.ibb.co.com/Xfg0zs6D/GPSTIAA-LOGO.png" alt="GPSTIAA" className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-xs font-bold leading-tight opacity-70 uppercase tracking-widest">Buku Induk</h1>
              <p className="text-sm font-semibold">GPSTIAA Siloam</p>
            </div>
            {/* Mobile close button */}
            <button 
              className="md:hidden ml-auto p-1 text-slate-400 hover:text-white focus:outline-none"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="space-y-1 flex-1">
            {renderNavLinks()}
          </nav>
          <div className="mt-auto pt-6 border-t border-white border-opacity-10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center font-bold uppercase shrink-0">
                  {user?.username?.[0] || 'U'}
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium truncate">{user?.username}</p>
                  <p className="text-xs opacity-50">
                    {user?.username === 'fajrur' ? 'Pemilik Utama' : 'Administrator'}
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
              {activeTab === 'members' && "Data Anggota"}
              {activeTab === 'birthdays' && "Ulang Tahun Anggota"}
              {activeTab === 'reports' && "Laporan Mingguan"}
              {activeTab === 'stats' && "Statistik Jemaat"}
              {activeTab === 'map' && "Pemetaan Jemaat"}
              {activeTab === 'settings' && "Pengaturan Sistem"}
            </h2>
          </div>
          {activeTab === 'members' && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
              
              {/* Notification Bell */}
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
                          <div key={notif.id} className={`p-3 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${idx === notifications.length - 1 ? 'border-none' : ''}`}>
                            <div className="flex gap-3 items-start">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'birthday' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                {notif.type === 'birthday' ? <Gift className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{notif.title}</h4>
                                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{notif.message}</p>
                                <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 block">
                                  {notif.type === 'birthday' ? 'Hari ini' : new Date(notif.dateRef).toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}
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

              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleImportCSV}
                className="hidden"
              />
              
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
                      <Download className="h-3.5 w-3.5" /> Template CSV
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
                          <Upload className="h-3.5 w-3.5" /> Impor dari CSV
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setIsBulkEntryOpen(true)}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors flex items-center gap-2"
                    >
                      <TableProperties className="h-3.5 w-3.5" /> Input Massal (Grid)
                    </button>
                    <div className="h-px bg-slate-100 dark:bg-slate-700/50 my-1"></div>
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors flex items-center gap-2"
                    >
                      <span className="text-sm">📥</span> Unduh format Excel
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedMember(undefined);
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-5 py-2 rounded-lg font-bold transition-all focus:outline-none shadow-sm shadow-blue-600/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
              >
                + Tambah Data
              </button>
            </div>
          )}
        </header>

        <div className="p-6 flex-1 flex flex-col gap-6 overflow-hidden">
          {activeTab === 'members' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 shrink-0">
                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]">
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase truncate">Total Anggota</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-900">{members.length}</p>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]">
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase truncate">Jemaat Pria</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-900">{members.filter(m => m.jenis_kelamin === 'Pria').length}</p>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]">
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase truncate">Jemaat Wanita</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-900">{members.filter(m => m.jenis_kelamin === 'Wanita').length}</p>
                </div>
                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)]">
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium uppercase truncate">Update Terakhir</p>
                  <p className="text-sm md:text-lg font-bold text-blue-900 mt-0 md:mt-2 truncate">Real-time</p>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] flex flex-col min-h-0">
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

                    <select
                      className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none pr-8 cursor-pointer relative"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.2rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">Semua Status</option>
                      <option value="Aktif">Anggota Aktif</option>
                      <option value="Keluar">Sudah Keluar</option>
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
                        <option value="tgl_masuk_desc">Terbaru</option>
                        <option value="tgl_masuk_asc">Terlama</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-auto flex-1 w-full relative">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr className="text-slate-400 uppercase font-bold border-b border-slate-200">
                        <th className="p-3">#</th>
                        <th className="p-3">No. Anggota</th>
                        <th className="p-3">Nama Lengkap</th>
                        <th className="p-3">JK</th>
                        <th className="p-3">TTL</th>
                        <th className="p-3">No. Telp</th>
                        <th className="p-3">Alamat Asal</th>
                        <th className="p-3">Jenis Baptis</th>
                        <th className="p-3">Tgl Masuk</th>
                        <th className="p-3">Foto</th>
                        <th className="p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isLoading ? (
                        <tr>
                          <td colSpan={10} className="p-6 text-center text-slate-500">Memuat data...</td>
                        </tr>
                      ) : filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="p-6 text-center text-slate-500">Tidak ada data jemaat yang cocok.</td>
                        </tr>
                      ) : (
                        paginatedMembers.map((member, idx) => {
                          const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                          let badgeStyle = "bg-slate-100 text-slate-700";
                          if (member.jenis_baptis === "SIDI") badgeStyle = "bg-blue-100 text-blue-700";
                          else if (member.jenis_baptis === "Baptis Dewasa") badgeStyle = "bg-emerald-100 text-emerald-700";
                          else if (member.jenis_baptis === "Baptis Kecil") badgeStyle = "bg-amber-100 text-amber-700";

                          return (
                            <tr key={member.id} className="hover:bg-slate-50 group">
                              <td className="p-3">{globalIdx}</td>
                              <td className="p-3">
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
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                <div>{member.nama_lengkap}</div>
                                <span className={`inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider ${!member.tanggal_keluar ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                  {!member.tanggal_keluar ? 'Aktif' : 'Keluar'}
                                </span>
                              </td>
                              <td className="p-3">{member.jenis_kelamin === 'Pria' ? 'Pria' : 'Wanita'}</td>
                              <td className="p-3">{member.tempat_lahir}, {formatDateDDMMYYYY(member.tanggal_lahir)}</td>
                              <td className="p-3 font-mono">{member.no_telp || '-'}</td>
                              <td className="p-3 max-w-[150px] truncate" title={member.alamat_asal}>{member.alamat_asal}</td>
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
                              <td className="p-3 text-right">
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
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
                    <span className="text-xs text-slate-500 font-medium">
                      Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredMembers.length)} dari {filteredMembers.length} jemaat
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold focus:outline-none transition-colors"
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
                            className={`px-3 py-1 rounded border text-xs font-semibold focus:outline-none transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-semibold focus:outline-none transition-colors"
                      >
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'reports' && (
            <WeeklyReportsPanel />
          )}

          {activeTab === 'birthdays' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] flex flex-col min-h-0">
              <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                       <Gift className="text-blue-600 dark:text-blue-400 w-5 h-5"/> Daftar Ulang Tahun Terdekat
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Menampilkan jemaat yang berulang tahun berdasarkan jarak hari terdekat dari <span className="font-semibold text-slate-700 dark:text-slate-200">{new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</span>
                    </p>
                  </div>
                  <select
                    className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    value={birthdayStatusFilter}
                    onChange={(e) => setBirthdayStatusFilter(e.target.value)}
                  >
                    <option value="">Semua Status</option>
                    <option value="Aktif">Anggota Aktif</option>
                    <option value="Keluar">Sudah Keluar</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-auto flex-1 w-full bg-slate-50/50 dark:bg-slate-900/50 p-3 sm:p-4 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {members
                    .filter(m => birthdayStatusFilter === 'Aktif' ? !m.tanggal_keluar : birthdayStatusFilter === 'Keluar' ? !!m.tanggal_keluar : true)
                    .map(m => ({ ...m, daysLeft: getDaysToBirthday(m.tanggal_lahir) }))
                    .filter(m => m.daysLeft !== null)
                    .sort((a, b) => (a.daysLeft as number) - (b.daysLeft as number))
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
                        cardStyle = "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 shadow-blue-100/50 dark:shadow-none ring-1 ring-blue-500 dark:ring-blue-600";
                        badgeStyle = "bg-blue-600 dark:bg-blue-500 text-white animate-pulse shadow-sm";
                        iconColor = "text-blue-600 dark:text-blue-400";
                        iconBg = "bg-blue-100 dark:bg-blue-900/50";
                      } else if (isUpcoming) {
                        cardStyle = "bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/50";
                        badgeStyle = "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-semibold";
                        iconColor = "text-emerald-500 dark:text-emerald-400";
                      }
                      
                      const birthDateObj = new Date(m.tanggal_lahir);
                      const displayDate = birthDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
                      const currentAge = new Date().getFullYear() - birthDateObj.getFullYear();
                      const nextAge = currentAge + (new Date(new Date().getFullYear(), birthDateObj.getMonth(), birthDateObj.getDate()) < new Date() ? 1 : 0);

                      return (
                        <div key={m.id} className={`p-4 rounded-xl border transition-all hover:shadow-md ${cardStyle} flex flex-col relative overflow-hidden`}>
                           {isToday && (
                             <div className="absolute -top-6 -right-6 text-blue-100 dark:text-blue-900/30 opacity-50 rotate-12 pointer-events-none">
                               <Gift size={100} />
                             </div>
                           )}
                           
                           <div className="flex justify-between items-start mb-3 relative z-10">
                             <div className="flex-1 min-w-0 pr-2">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base truncate" title={m.nama_lengkap}>{m.nama_lengkap}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{m.nomor_anggota}</p>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                    {isActive ? 'Aktif' : 'Keluar'}
                                  </span>
                                </div>
                             </div>
                             <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
                               <Gift className="w-5 h-5"/>
                             </div>
                           </div>
                           
                           <div className="mt-auto space-y-3 relative z-10">
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                🎂 <span className="font-medium text-slate-700 dark:text-slate-200">{displayDate}</span> 
                                <span className="text-xs text-slate-400 dark:text-slate-500">({nextAge} thn)</span>
                              </div>
                              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                                 <span className="text-xs text-slate-500 dark:text-slate-400">Hitung Mundur:</span>
                                 <span className={`px-2.5 py-1 rounded-md text-xs ${badgeStyle}`}>
                                   {isToday ? 'HARI INI!' : `${days} Hari Lagi`}
                                 </span>
                              </div>
                           </div>
                        </div>
                      );
                  })}
                  
                  {members.filter(m => m.tanggal_lahir && !isNaN(new Date(m.tanggal_lahir).getTime())).length === 0 && (
                     <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                       <Gift className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                       <p>Belum ada data tanggal lahir yang valid untuk ditampilkan.</p>
                     </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] p-4 sm:p-6 overflow-y-auto">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6">Statistik Jemaat</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
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
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 text-center mb-4 uppercase tracking-wider">Status Baptis</h3>
                  <div className="h-56 sm:h-64 -ml-4 sm:-ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Belum', value: members.filter(m => !m.jenis_baptis || m.jenis_baptis === '').length },
                        { name: 'Kecil', value: members.filter(m => m.jenis_baptis === 'Baptis Kecil').length },
                        { name: 'Dewasa', value: members.filter(m => m.jenis_baptis === 'Baptis Dewasa').length },
                        { name: 'SIDI', value: members.filter(m => m.jenis_baptis === 'SIDI').length }
                      ]}>
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} interval={0} />
                        <YAxis tick={{fontSize: 10, fill: isDarkMode ? '#94a3b8' : '#64748b'}} width={35} />
                        <Tooltip cursor={{fill: isDarkMode ? '#334155' : '#f1f5f9'}} contentStyle={{ backgroundColor: isDarkMode ? '#1e293b' : '#fff', borderColor: isDarkMode ? '#334155' : '#e2e8f0', color: isDarkMode ? '#f8fafc' : '#1e293b' }} />
                        <Bar dataKey="value" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] p-4 sm:p-6 flex flex-col min-h-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 sm:mb-6 shrink-0">Pemetaan Jemaat Berdasarkan Alamat</h2>
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {Object.entries(
                    members.reduce((acc, m) => {
                      const addr = m.alamat_asal || 'Tidak Diketahui';
                      // simple grouping by first word of address
                      const groupName = addr.split(' ')[0] || 'Lainnya';
                      acc[groupName] = (acc[groupName] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([group, count]) => (
                    <div key={group} className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-100 truncate" title={group}>{group}</p>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Area/Wilayah</p>
                      </div>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 flex items-center justify-center font-bold text-xs sm:text-sm">
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] p-6 overflow-y-auto">
              <div className="max-w-xl mx-auto space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">Pengaturan Sistem</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Kelola preferensi akun dan aplikasi Buku Induk GPSTIAA Siloam.</p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Informasi Akun</h3>
                  <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Nama Pengguna</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{user?.username}</p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-bold rounded-full">
                      {user?.username === 'fajrur' ? 'Pemilik Utama' : 'Administrator'}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-700 pb-2">Preferensi Tampilan</h3>
                  <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Tema Gelap (Dark Mode)</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Beralih ke tampilan gelap untuk kenyamanan mata</p>
                    </div>
                    <button 
                      onClick={toggleDarkMode}
                      className={`w-12 h-6 rounded-full relative transition-colors focus:outline-none ${isDarkMode ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isDarkMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
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
              </div>
            </div>
          )}
        </div>
      </main>

      <MemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={selectedMember}
        onSave={handleSaveMember}
      />
      
      <MemberViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        member={memberToView}
      />

      <BulkEntryModal
        isOpen={isBulkEntryOpen}
        onClose={() => setIsBulkEntryOpen(false)}
        onSuccess={(count) => {
          addToast(`Input massal berhasil! ${count} jemaat baru ditambahkan.`, 'success');
        }}
      />

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Konfirmasi Penghapusan</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Apakah Anda yakin ingin menghapus data jemaat ini? Tindakan ini tidak dapat dibatalkan.
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

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm text-white animate-in slide-in-from-right-8 fade-in duration-300 pointer-events-auto ${
              toast.type === 'success' ? 'bg-emerald-600' : 
              toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
            <span className="font-medium whitespace-pre-wrap">{toast.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="p-1 hover:bg-white/20 rounded-full transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Full Screen Greeting Modal */}
      {greetingMessage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.2)] max-w-lg w-full p-12 text-center flex flex-col items-center animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-700">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mb-8 shadow-inner">
              <span className="text-4xl">👋</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium tracking-tight text-slate-800 dark:text-slate-100 mb-8 leading-snug">
              <span className="opacity-90">{greetingMessage.split(' ').slice(0, 2).join(' ')}</span>
              <br />
              <span className="font-semibold text-blue-700 dark:text-blue-400">{greetingMessage.split(' ').slice(2).join(' ')}</span>
            </h2>
            <button
              onClick={() => setGreetingMessage(null)}
              className="w-full sm:w-auto px-12 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-all hover:scale-105 active:scale-95 focus:outline-none shadow-lg shadow-blue-600/30 tracking-wide"
            >
              Oke, Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
