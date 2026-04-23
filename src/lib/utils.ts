export const formatDateDDMMYYYY = (dateString: string | undefined | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const formatDateDDMMYYYY_WithMonthName = (dateString: string | undefined | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('id-ID', {day: '2-digit', month: 'long', year: 'numeric'});
};

// Input Formatting (from YYYY-MM-DD to DD-MM-YYYY)
export const toIndonesianDateInput = (dateString: string | undefined | null) => {
  if (!dateString) return '';
  const parts = dateString.split('-'); // typically YYYY-MM-DD from DB
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // It's YYYY-MM-DD, return DD-MM-YYYY
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateString;
};

// Automatic formatting while typing
export const maskDateInput = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length >= 5) {
    return `${v.slice(0, 2)}-${v.slice(2, 4)}-${v.slice(4, 8)}`;
  } else if (v.length >= 3) {
    return `${v.slice(0, 2)}-${v.slice(2)}`;
  }
  return v;
};

// Output parsing (from typed DD-MM-YYYY to DB YYYY-MM-DD)
export const parseIndonesianDateInput = (value: string) => {
  const parts = value.split('-');
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return value; // If incomplete or wrong, return raw to avoid breaking state prematurely
};

// Image Compression (Agresif: Lebar max 600px, Kualitas 0.6 untuk hasil < 300KB)
export const compressImage = (file: File, maxWidth = 600, quality = 0.6): Promise<File> => {
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

export const getDirectDriveLink = (url: string | null | undefined): string => {
  if (!url) return '';
  
  let finalUrl = url;
  // Regex to extract the FILE_ID from standard Google Drive sharing links
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    const fileId = match[1];
    // Convert to Drive's content link
    finalUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  }
  
  // Menggunakan wsrv.nl (Imageserv proxy gratis) sebagai jembatan Bypass CORS
  // Supaya fungsi "html-to-image" saat Download tidak mengira ini serangan "Tainted Canvas"
  return `https://wsrv.nl/?url=${encodeURIComponent(finalUrl)}&output=webp&we`;
};
