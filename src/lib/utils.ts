export const formatDateDDMMYYYY = (dateString: any) => {
  if (!dateString) return '-';
  if (typeof dateString === 'string' && dateString.includes('-') && dateString.split('-')[0].length !== 4) {
    return dateString.replace(/-/g, '/');
  }
  
  let date: Date;
  if (typeof dateString?.toDate === 'function') {
    date = dateString.toDate();
  } else {
    date = new Date(dateString);
  }
  
  if (isNaN(date.getTime())) return typeof dateString === 'string' ? dateString : '-';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateDDMMYYYY_WithMonthName = (dateString: any) => {
  if (!dateString) return '-';
  let date: Date;
  if (typeof dateString?.toDate === 'function') {
    date = dateString.toDate();
  } else {
    date = new Date(dateString);
  }
  if (isNaN(date.getTime())) return typeof dateString === 'string' ? dateString : '-';
  return date.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
};

// Input Formatting (from YYYY-MM-DD to DD/MM/YYYY)
export const toIndonesianDateInput = (dateString: any) => {
  if (!dateString || typeof dateString !== 'string') return '';
  const parts = dateString.split('-'); // typically YYYY-MM-DD from DB
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // It's YYYY-MM-DD, return DD/MM/YYYY
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateString;
};

// Automatic formatting while typing
export const maskDateInput = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length >= 5) {
    return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)}`;
  } else if (v.length >= 3) {
    return `${v.slice(0, 2)}/${v.slice(2)}`;
  }
  return v;
};

// Output parsing (from typed DD/MM/YYYY to DB YYYY-MM-DD)
export const parseIndonesianDateInput = (value: string) => {
  if (value.includes('/')) {
    const parts = value.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  } else if (value.includes('-')) {
    const parts = value.split('-');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return value; // If incomplete or wrong, return raw to avoid breaking state prematurely
};

// Input Formatting (from YYYY-MM to MM-YYYY)
export const toIndonesianMonthYearInput = (dateString: string | undefined | null) => {
  if (!dateString) return '';
  const parts = dateString.split('-'); // typically YYYY-MM
  if (parts.length === 2) {
    if (parts[0].length === 4) {
      // It's YYYY-MM, return MM-YYYY
      return `${parts[1]}-${parts[0]}`;
    }
  }
  return dateString;
};

// Automatic formatting while typing for MM-YYYY
export const maskMonthYearInput = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length >= 3) {
    return `${v.slice(0, 2)}-${v.slice(2, 6)}`;
  }
  return v;
};

// Output parsing (from typed MM-YYYY to DB YYYY-MM)
export const parseMonthYearInput = (value: string) => {
  const parts = value.split('-');
  if (parts.length === 2 && parts[1].length === 4) {
    return `${parts[1]}-${parts[0]}`;
  }
  return value; // If incomplete, keep raw
};


// Image Compression (Agresif: Lebar max 400px, Kualitas 0.5 untuk hasil super cepat dan kecil)
export const compressImage = (file: File, maxWidth = 400, quality = 0.5): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return resolve(file);
      
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(newFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = event.target.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};

// Auto Export & Proxy Image Link
// Digunakan agar gambar dari Google Drive / tempat lain dapat dirender ke dalam HTML Canvas tanpa terblokir sistem keamanan Strict CORS (solusi bug saat unduh PDF/JPG).
export const formatNameTitleCase = (name: string | undefined): string => {
  if (!name) return '';
  if (name === name.toUpperCase()) {
    return name.toLowerCase().split(' ').map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }
  return name;
};

// Calculate Days to Birthday
export const getDaysToBirthday = (birthDateStr: string) => {
  if (!birthDateStr) return null;
  const bDate = new Date(birthDateStr);
  if (isNaN(bDate.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextBday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
  
  if (nextBday.getTime() < today.getTime()) {
    nextBday.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = nextBday.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const calculateAge = (birthDateStr: string | undefined): number | null => {
  if (!birthDateStr) return null;
  const bDate = new Date(birthDateStr);
  if (isNaN(bDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - bDate.getFullYear();
  const m = today.getMonth() - bDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
    age--;
  }
  return age;
};

export const isBirthdayInWeek = (birthDateStr: string, offsetWeeks: number) => {
  if (!birthDateStr) return false;
  const bDate = new Date(birthDateStr);
  if (isNaN(bDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find start of current week (let's say Monday)
  const dayOfWeek = today.getDay() || 7; // 1-7, Mon-Sun
  const startOfThisWeek = new Date(today.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
  
  // Calculate target week
  const startOfTargetWeek = new Date(startOfThisWeek.getTime() + offsetWeeks * 7 * 24 * 60 * 60 * 1000);
  const endOfTargetWeek = new Date(startOfTargetWeek.getTime() + 6 * 24 * 60 * 60 * 1000);

  // Check the birthday in this year, previous year, and next year just in case
  const yearsToCheck = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];
  
  for (const year of yearsToCheck) {
    const bday = new Date(year, bDate.getMonth(), bDate.getDate());
    if (bday.getTime() >= startOfTargetWeek.getTime() && bday.getTime() <= endOfTargetWeek.getTime()) {
      return true;
    }
  }
  return false;
};

export const getDirectDriveLink = (url: string | null | undefined): string => {
  if (!url) return '';
  
  if (url.includes('firebasestorage.googleapis.com') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  let finalUrl = url;
  // Regex to extract the FILE_ID from standard Google Drive sharing links
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    const fileId = match[1];
    // Convert to Drive's content link
    finalUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&output=webp&we`;
  }
  
  return url;
};
