# TugasKu3

Versi yang sudah diperbaiki (modularized):

- index.html
- css/style.css
- js/utils.js
- js/storage.js
- js/render.js
- js/main.js
- manifest.json
- sw.js

Perbaikan utama:
- Memindahkan splash ke dalam <body> dan menghapus duplikat mainContent.
- Memisahkan CSS dan JavaScript ke file terpisah untuk maintainability.
- Mengganti inline onclick dengan event delegation (lebih aman dan stabil).
- Menambahkan sanitasi dan helper di utils.js.
- Menggunakan DocumentFragment untuk render list agar lebih efisien.
- Menyimpan data ke localStorage lewat storage.js.
- Menambahkan Service Worker sederhana (sw.js) dan manifest.

Cara menjalankan:
1. Pastikan struktur folder sama seperti repository (assets/, css/, js/).
2. Buka `index.html` di browser atau deploy di static hosting.
3. (Opsional) Daftarkan service worker untuk caching.

Catatan:
- Ikon & splash harus diletakkan di folder assets/ (my-icon.png, splash.png, icon-192.png, icon-512.png).
- Jika perlu fitur lebih lanjut (sinkronisasi cloud, export PDF, dsb.), saya bisa bantu lagi.