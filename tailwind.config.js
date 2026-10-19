/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        circlo: {
          green: '#3D6B00',       // warna brand, tombol utama, teks aktif
          lime: '#8BC34A',        // aksen hijau muda (kartu, ikon)
          olive: '#ABB963',       // badge skor
          soft: '#E4F2D3',        // pill kondisi
          bg: '#F5F9FF',          // latar halaman
          ink: '#0F1E29',         // teks utama
          muted: '#4A5A55',       // teks sekunder
          line: '#D3E2EC',        // garis dan border kartu
          field: '#F1F3F4',       // latar input
          fieldline: '#C9CEC9',   // border input
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Montserrat Variable"', 'Montserrat', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,30,41,0.04), 0 8px 24px rgba(15,30,41,0.04)',
      },
    },
  },
  plugins: [],
};
