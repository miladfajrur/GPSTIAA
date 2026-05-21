export interface Member {
  id?: string;
  nomor_anggota: string;
  nama_lengkap: string;
  jenis_kelamin: "Pria" | "Wanita" | "";
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat_asal: string;
  provinsi?: string;
  no_telp?: string;
  jenis_baptis: string;
  keterangan_baptis: string;
  tanggal_masuk: string;
  tanggal_keluar: string;
  foto_url: string;
  tenantId: string;
  createdAt?: any;
  updatedAt?: any;
}

export type AuthUser = {
  username: string;
};

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}


export interface WeeklyReport {
  id?: string;
  tenantId: string;
  tanggal_ibadah: string;
  nama_ibadah: string;
  kehadiran_dewasa: number;
  kehadiran_pemuda: number;
  kehadiran_anak: number;
  persembahan_umum: number;
  perpuluhan: number;
  diakonia: number;
  pemasukan_lainnya: number;
  // Pengeluaran removed
  keterangan: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MediaRepo {
  id?: string;
  tenantId: string;
  title: string;
  category?: string;
  bulan: string; // YYYY-MM
  driveLink: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface DocumentItem {
  id?: string;
  tenantId: string;
  title: string;
  category: "Masuk" | "Keluar";
  date: string;
  driveLink: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface WorshipTheme {
  id?: string;
  tenantId: string;
  type: "Ibadah Umum" | "Sekolah Minggu" | "Pemahaman Alkitab";
  date: string;
  theme: string;
  verse?: string;
  description?: string;
  speaker: string;
  hasHolyCommunion?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface MisiRepo {
  id?: string;
  tenantId: string;
  title: string;
  bulan: string; // YYYY-MM
  driveLink: string;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface MisiFinance {
  id?: string;
  tenantId: string;
  date: string; // YYYY-MM-DD
  type: "Pemasukan" | "Pengeluaran";
  category: string;
  amount: number;
  description: string;
  createdAt?: any;
  updatedAt?: any;
}



