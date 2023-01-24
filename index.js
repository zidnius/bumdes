const express = require("express");
const mariadb = require("mariadb");
const bodyParser = require("body-parser");
const md5 = require("md5");

// --- Deklarasi dan pengaturan server ---
const app = express();
app.use(bodyParser.urlencoded({extended: true}));

// --- Koneksi ke database ---
const conn = mariadb.createConnection({
    host: "sql12.freemysqlhosting.net",
    user: "sql12593019",
    password: "f226symJtg",
    database: "sql12593019",
    supportBigNumbers: true,
});

// Agar semua data dikembalikan dalam bentuk json
app.use((req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
});

// --- Routing ---
// Route default
app.get("/", (req, res) => {
    res.sendStatus(200);
});

// -- Login --
// Route untuk melakukan pengecekan login
// GET http://localhost:3000/login
app.get("/login", async (req, res) => {
    const username = req.query.username;
    let password = req.query.password;

    // Jika username dan/atau password tidak disediakan,
    // kembalikan respon 'gagal'
    if (!username || !password)
        return res.json({
            success: false,
            message: "data tidak lengkap",
            data: null,
            count: 0,
        });

    password = md5(password);

    // Query ke database, lalu menghapus object
    // bernama "meta" karena tidak digunakan
    const rowAdmins = await conn.query(
        `SELECT * FROM admin WHERE username="${username}" AND password="${password}"`
    );
    delete rowAdmins.meta;

    // Jika data login admin ada, kembalikan
    // data admin tersebut
    if (rowAdmins.length)
        return res.json({
            success: true,
            message: "",
            data: rowAdmins[0],
            count: 1,
        });

    // Query ke database, lalu menghapus object
    // bernama "meta" karena tidak digunakan
    const rowCustomers = await conn.query(
        `SELECT * FROM pelanggan WHERE username="${username}" AND password="${password}"`
    );
    delete rowCustomers.meta;

    // Jika data login pelanggan ada, kembalikan
    // data pelanggan tersebut
    if (rowCustomers.length)
        return res.json({
            success: true,
            message: "",
            data: rowCustomers[0],
            count: 1,
        });

    // Jika tidak ada data login dari kedua tabel,
    // kembalikan respon 'gagal'
    return res.json({
        success: false,
        message: "pengguna tidak ditemukan",
        data: null,
        count: 0,
    });
});

// -- Barang Masuk --
// Route untuk mendapatkan data barang masuk
// GET http://localhost:3000/barang_masuk
app.get("/barang_masuk", async (req, res) => {
    const barangMasuk = await conn.query(
        "SELECT bm.id, tanggal, kode, nama, harga_beli, harga_jual, jumlah, stok " +
        "FROM barang_masuk bm JOIN barang b ON (bm.id_barang=b.id) " +
        "ORDER BY tanggal DESC"
    );
    delete barangMasuk.meta;

    // Jika data barang masuk ada, kembalikan
    // data barang masuk tersebut
    if (barangMasuk.length)
        return res.json({
            success: true,
            message: "",
            data: barangMasuk,
            count: barangMasuk.length,
        });

    return res.json({
        success: false,
        message: "data barang masuk tidak ditemukan",
        data: null,
        count: 0,
    });
});

// Route untuk memasukan data barang masuk baru
// POST http://localhost:3000/barang_masuk
app.post("/barang_masuk", async (req, res) => {
    // Memasukkan data yang dikirim ke dalam
    // variabel dataBarangMasuk untuk diproses
    const dataBarangMasuk = {
        id: req.body?.id,
        kode: req.body?.kode,
        nama: req.body?.nama,
        harga_beli: req.body?.harga_beli,
        harga_jual: req.body?.harga_jual,
        jumlah: req.body?.jumlah,
    };

    let barang;
    if (dataBarangMasuk.id === undefined) {
        await conn.query(
            `INSERT INTO barang (kode, nama, stok) VALUES ("${dataBarangMasuk.kode}", "${dataBarangMasuk.nama}", "${dataBarangMasuk.jumlah}")`
        );

        barang = await conn.query(
            `SELECT * FROM barang WHERE kode="${dataBarangMasuk.kode}" AND nama="${dataBarangMasuk.nama}"`
        );
    } else {
        barang = await conn.query(
            `SELECT * FROM barang WHERE kode="${dataBarangMasuk.kode}" AND nama="${dataBarangMasuk.nama}"`
        );
    }

    barang = barang[0];

    const tanggal = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
    const barangMasuk = await conn.query(
        `INSERT INTO barang_masuk (id_barang, harga_beli, harga_jual, jumlah, tanggal) ` +
        `VALUES ("${barang.id}", "${dataBarangMasuk.harga_beli}", "${dataBarangMasuk.harga_jual}", "${dataBarangMasuk.jumlah}", "${tanggal}")`
    );

    if (barangMasuk.affectedRows)
        return res.json({
            success: true,
            message: "",
            data: null,
            count: 1,
        });
    return res.json({
        success: false,
        message: "gagal memasukkan data barang masuk",
        data: null,
        count: 0,
    });
});

// Route untuk mengedit data barang masuk
// PATCH http://localhost:3000/barang_masuk
app.patch("/barang_masuk", async (req, res) => {
    const dataBarangMasuk = {
        id: req.body?.id,
        kode: req.body?.kode,
        nama: req.body?.nama,
        harga_beli: req.body?.harga_beli,
        harga_jual: req.body?.harga_jual,
        jumlah: req.body?.jumlah,
    };

    let barangMasukQuery = await conn.query(
        `SELECT * FROM barang_masuk WHERE id="${dataBarangMasuk.id}"`
    );
    barangMasukQuery = barangMasukQuery[0];

    if (dataBarangMasuk.kode !== undefined) {
        await conn.query(
            `UPDATE barang SET kode="${dataBarangMasuk.kode}", nama="${dataBarangMasuk.nama}" ` +
            `WHERE id="${barangMasukQuery.id_barang}"`
        );
    }

    // Masukan data barang masuk ke tabel barang_masuk
    const tanggal = new Date(new Date().getTime() + 7 * 60 * 60 * 1000)
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

    const barangMasuk = await conn.query(
        `UPDATE barang_masuk ` +
        `SET harga_beli="${dataBarangMasuk.harga_beli}", harga_jual="${dataBarangMasuk.harga_jual}", ` +
        `jumlah="${dataBarangMasuk.jumlah}", tanggal="${tanggal}" ` +
        `WHERE id="${dataBarangMasuk.id}"`
    );
    delete barangMasuk.meta;

    // Update stok di tabel barang agar sesuai
    // dengan barang masuk dan transaksi
    await conn.query(
        "UPDATE barang, (SELECT id_barang, SUM(jumlah) stok " +
        "FROM (SELECT id_barang, SUM(jumlah) jumlah FROM barang_masuk GROUP BY id_barang UNION ALL SELECT id_barang, -SUM(jumlah) jumlah FROM barang_transaksi GROUP BY id_barang) x GROUP BY id_barang) tbl_stok " +
        "SET barang.stok=tbl_stok.stok WHERE barang.id=tbl_stok.id_barang"
    );

    if (barangMasuk.affectedRows)
        return res.json({
            success: true,
            message: "",
            data: null,
            count: 1,
        });

    return res.json({
        success: false,
        message: "tidak ada data barang masuk yang berubah",
        data: null,
        count: 0,
    });
});

app.delete("/barang_masuk", async (req, res) => {
    const id = req.body?.id;

    if (id === undefined)
        return res.json({
            success: false,
            message: "data tidak lengkap",
            data: null,
            count: 0,
        });

    const barangMasuk = await conn.query(
        `DELETE FROM barang_masuk WHERE id="${id}"`
    );

    if (barangMasuk.affectedRows)
        return res.json({
            success: true,
            message: "",
            data: null,
            count: 1,
        });

    return res.json({
        success: false,
        message: "tidak ada data barang masuk yang berubah",
        data: null,
        count: 0,
    });
});

// -- Barang --
// Route untuk mendapatkan data barang
// GET http://localhost:3000/barang
app.get("/barang", async (req, res) => {
    const barang = await conn.query("SELECT * FROM barang");
    delete barang.meta;

    if (barang.length)
        return res.json({
            success: true,
            message: "",
            data: barang,
            count: barang.length,
        });

    return res.json({
        success: false,
        message: "data barang tidak ditemukan",
        data: null,
        count: 0,
    });
});

// -- Stok Barang --
// Route untuk mendapatkan data stok barang
// GET http://localhost:3000/stok_barang
app.get("/stok_barang", async (req, res) => {
    const search = req.query?.search ?? "";
    const stokBarang = await conn.query(
        "SELECT m.id, tanggal, kode, nama, harga_beli, harga_jual, stok FROM barang_masuk m " +
        "JOIN barang b ON m.id_barang=b.id " +
        "WHERE m.tanggal = ( " +
        "SELECT max(tanggal) " +
        "FROM barang_masuk m2 " +
        "WHERE m2.id_barang = m.id_barang " +
        ") " +
        (search
            ? `AND (LOWER(kode) LIKE "%${search.toLowerCase()}%" OR LOWER(nama) LIKE "%${search.toLowerCase()}%")`
            : "")
    );
    delete stokBarang.meta;

    // Jika data stok barang ada, kembalikan
    // data stok barang tersebut
    if (stokBarang.length)
        return res.json({
            success: true,
            message: "",
            data: stokBarang,
            count: stokBarang.length,
        });

    return res.json({
        success: false,
        message: "data stok barang tidak ditemukan",
        data: null,
        count: 0,
    });
});

// -- Pelanggan --
// Route untuk mendapatkan data pelanggan
// GET http://localhost:3000/pelanggan
app.get("/pelanggan", async (req, res) => {
    const search = req.query?.search ?? "";
    const pelanggan = await conn.query(
        "SELECT *" +
        "FROM pelanggan p " +
        (search
            ? `WHERE nama LIKE "%${search.toLowerCase()}%" `
            : "")
    );
    delete pelanggan.meta;

    // Jika data pelanggan ada, kembalikan
    // data pelanggan tersebut
    if (pelanggan.length)
        return res.json({
            success: true,
            message: "",
            data: pelanggan,
            count: pelanggan.length,
        });

    return res.json({
        success: false,
        message: "data pelanggan tidak ditemukan",
        data: null,
        count: 0,
    });
});


app.get("/tabunganpelanggan", async (req, res) => {
    const search = req.query?.search ?? "";
    const pelanggan = await conn.query(
        "SELECT p.id, nama, username, alamat, tabungan, h.id id_transaksi, tanggal, sisa " +
        "FROM pelanggan p LEFT JOIN histori_tabungan h ON (p.id=h.id_pelanggan) " +
        "WHERE h.id = (SELECT id FROM histori_tabungan WHERE id_pelanggan=p.id ORDER BY id DESC LIMIT 1) " +
        (search
            ? `AND LOWER(nama) LIKE "%${search.toLowerCase()}%" `
            : "") +
        "UNION ALL SELECT id, nama, username, alamat, tabungan, NULL, NULL, 0 FROM pelanggan "
    );
    delete pelanggan.meta;

    // Jika data pelanggan ada, kembalikan
    // data pelanggan tersebut
    if (pelanggan.length)
        return res.json({
            success: true,
            message: "",
            data: pelanggan,
            count: pelanggan.length,
        });

    return res.json({
        success: false,
        message: "data pelanggan tidak ditemukan",
        data: null,
        count: 0,
    });
});


// Route untuk menambah pelanggan baru
// POST http://localhost:3000/pelanggan
app.post("/pelanggan", async (req, res) => {
    const dataPelanggan = {
        nama: req.body?.nama,
        username: req.body?.username.toLowerCase(),
        password: req.body?.password,
        alamat: req.body?.alamat,
        tabungan: 0,
    };

    // Mengecek apakah data sudah ada
    const queryPelanggan = await conn.query(
        `SELECT * FROM pelanggan WHERE LOWER(nama)="${dataPelanggan.nama.toLowerCase()}" OR LOWER(username)="${dataPelanggan.username
        }"`
    );
    delete queryPelanggan.meta;

    if (queryPelanggan.length)
        return res.json({
            success: false,
            message: "data sudah ada",
            data: null,
            count: 0,
        });

    dataPelanggan.password = md5(dataPelanggan.password);

    // Masukan data ke tabel pelanggan
    const pelanggan = await conn.query(
        `INSERT INTO pelanggan (nama, username, password, alamat, tabungan) ` +
        `VALUES ("${dataPelanggan.nama}", "${dataPelanggan.username}", "${dataPelanggan.password}", "${dataPelanggan.alamat}", "${dataPelanggan.tabungan}")`
    );
    delete pelanggan.meta;

    if (pelanggan.affectedRows)
        return res.json({
            success: true,
            message: "",
            data: null,
            count: 1,
        });

    return res.json({
        success: false,
        message: "gagal memasukkan data pelanggan",
        data: null,
        count: 0,
    });
});

// -- Histori Tabungan --
// Route untuk mendapatkan data histori tabungan
// GET http://localhost:3000/histori_tabungan
app.get("/histori_tabungan", async (req, res) => {
    const userId = req.query?.pelangganId;

    let where = "";
    if (userId !== undefined) where = `WHERE h.id_pelanggan=${userId} `;

    const historiTabungan = await conn.query(
        "SELECT *, date_format(tanggal, '%d-%m-%Y') as tanggal2 FROM histori_tabungan h " +
        where +
        "ORDER BY tanggal DESC"
    );
    delete historiTabungan.meta;

    // Jika data ada, kembalikan
    // data histori tabungan tersebut
    if (historiTabungan.length)
        return res.json({
            success: true,
            message: "",
            data: historiTabungan,
            count: historiTabungan.length,
        });

    return res.json({
        success: false,
        message: "data histori tabungan tidak ditemukan",
        data: null,
        count: 0,
    });
});

// -- Laporan Keuangan --
// Route untuk mendapatkan data laporan keuangan
// GET http://localhost:3000/laporan_keuangan
app.get("/laporan_keuangan", async (req, res) => {
    const laporanKeuangan = await conn.query("");
    if (historiPelanggan.length)
        return res.json({
            success: true,
            message: "",
            data: historiPelanggan,
            count: historiPelanggan.length,
        });

    return res.json({
        success: false,
        message: "data histori pelanggan tidak ditemukan",
        data: null,
        count: 0,
    });
});

// Route untuk
// POST http://localhost:3000/transaksi
app.post("/transaksi", async (req, res) => {

    const datatransaksi = {
        id_pelanggan: req.body?.id_pelanggan,
        total: req.body?.total,
        diskon: req.body?.diskon,
        dibayar: req.body?.bayar,
        tabungan_dipakai: req.body?.penggunaantabungan,
        kembali: req.body?.kembali,
        tanggal: req.body.tanggal,
    };

    const datahistoritabungan = {
        id_pelanggan: req.body?.id_pelanggan,
        penggunaan: req.body?.penggunaantabungan,
        sisa: (Number(req.body.saldotabungan) || 0) - (Number(req.body?.penggunaantabungan) || 0),
        tanggal: req.body.tanggal,
    }

    const databarang = req.body.databarang

    const historitabungan = await conn.query(`INSERT INTO histori_tabungan(id_pelanggan, penggunaan,sisa,tanggal) VALUES (${datahistoritabungan.id_pelanggan},${datahistoritabungan.penggunaan},${datahistoritabungan.sisa},"${datahistoritabungan.tanggal}")`)

    if (historitabungan.insertId) {
        await conn.query(`UPDATE pelanggan set tabungan=${datahistoritabungan.sisa} where id = ${datahistoritabungan.id_pelanggan}`)

        const transaksi = await conn.query(`INSERT INTO transaksi(id_pelanggan,total,diskon,dibayar,tabungan_dipakai,id_histori_tabungan,kembali,tanggal) VALUES(${datatransaksi.id_pelanggan},${datatransaksi.total},${datatransaksi.diskon},${datatransaksi.dibayar},${datatransaksi.tabungan_dipakai},${historitabungan.insertId},${datatransaksi.kembali},"${datatransaksi.tanggal}")`)

        if (transaksi.insertId) {
            databarang?.forEach(item => {
                const transaksibarang = conn.query(`INSERT INTO barang_transaksi(id_transaksi,id_barang,harga_jual,jumlah) VALUES(${transaksi.insertId},${item.id},${item.harga_jual},${item.jumlah})`)
            })

            return res.json({
                success: true,
                message: "",
                data: null,
                count: 1,
            });
        }
    }

    return res.json({
        success: false,
        message: "gagal memasukkan data barang masuk",
        data: null,
        count: 0,
    });
});

// Route untuk
// POST http://localhost:3000/menabung
app.post("/menabung", async (req, res) => {

    const datahistoritabungan = {
        id_pelanggan: req.body?.id_pelanggan,
        penggunaan: req.body?.penggunaantabungan,
        sisa: (Number(req.body.saldotabungan) || 0) - (Number(req.body?.penggunaantabungan) || 0),
        kembali: Number(req.body.kembali) || 0,
        tanggal: req.body.tanggal,
    }

    datahistoritabungan.hasilmenabung = datahistoritabungan.sisa + datahistoritabungan.kembali

    const historitabungan = await conn.query(`INSERT INTO histori_tabungan(id_pelanggan, pemasukan,sisa,tanggal) VALUES (${datahistoritabungan.id_pelanggan},${datahistoritabungan.kembali},${datahistoritabungan.hasilmenabung},"${datahistoritabungan.tanggal}")`)

    if (historitabungan.insertId) {
        await conn.query(`UPDATE pelanggan set tabungan=${datahistoritabungan.hasilmenabung} where id = ${datahistoritabungan.id_pelanggan}`)


        return res.json({
            success: true,
            message: "",
            data: null,
            count: 1,
        });
    }

    return res.json({
        success: false,
        message: "gagal memasukkan data menabung",
        data: null,
        count: 0,
    });
});
// Route untuk
// GET http://localhost:3000/laporan_barang
app.get("/laporan_barang", async (req, res) => {
    const search = req.query?.search ?? "";
    console.log(search);
    const datalaporan = await conn.query(`SELECT barang_transaksi.*, barang_masuk.harga_beli as harga_beli, barang.nama as nama, barang.kode as kode, date_format(transaksi.tanggal, "%d-%m-%Y") as tanggal, SUM(barang_transaksi.harga_jual * barang_transaksi.jumlah) as total from barang_transaksi left join barang on barang.id = barang_transaksi.id_barang left join barang_masuk on barang.id = barang_masuk.id_barang left join transaksi on barang_transaksi.id_transaksi = transaksi.id where transaksi.tanggal LIKE '%${search}%' group by barang_transaksi.id`)
    if (datalaporan.length)
        return res.json({
            success: true,
            message: "",
            data: datalaporan,
            count: datalaporan.length,
        });

    return res.json({
        success: false,
        message: "data laporan barang tidak ditemukan",
        data: null,
        count: 0,
    });
})

// Route untuk
// GET http://localhost:3000/laporan_diskon
app.get("/laporan_diskon", async (req, res) => {
    const search = req.query?.search ?? "";
    const datalaporan = await conn.query(`SELECT  date_format(transaksi.tanggal, "%d-%m-%Y") as tanggal, diskon from transaksi where transaksi.tanggal LIKE '%${search}%' and diskon > 0`)
    if (datalaporan.length)
        return res.json({
            success: true,
            message: "",
            data: datalaporan,
            count: datalaporan.length,
        });

    return res.json({
        success: false,
        message: "data laporan barang tidak ditemukan",
        data: null,
        count: 0,
    });
})

// Route untuk
// GET http://localhost:3000/total_omset
app.get("/total_omset", async (req, res) => {
    const search = req.query?.search ?? "";
    const datalaporan = await conn.query(`SELECT SUM(total) as total_omset, SUM(diskon) as total_diskon, SUM(total + diskon) as sub_total from transaksi where transaksi.tanggal LIKE '%${search}%'`)
    if (datalaporan.length)
        return res.json({
            success: true,
            message: "",
            data: datalaporan?.[0] || {total_omset: 0},
            count: datalaporan.length,
        });

    return res.json({
        success: false,
        message: "data laporan barang tidak ditemukan",
        data: null,
        count: 0,
    });
})

// Route untuk
// DELETE http://localhost:3000/pelanggan
app.delete("/pelanggan", async (req, res) => {
    const id = req.body?.id;

    if (id === undefined)
        return res.json({
            success: false,
            message: "data tidak lengkap",
            data: null,
            count: 0,
        });

    const barangMasuk = await conn.query(
        `DELETE FROM pelanggan WHERE id="${id}"`
    );

    if (barangMasuk.affectedRows)
        return res.json({
            success: true,
            message: "",
            data: null,
            count: 1,
        });

    return res.json({
        success: false,
        message: "tidak ada data barang masuk yang berubah",
        data: null,
        count: 0,
    });
});


// --- Membuka Port ---
// Membuka port 3000 untuk dipakai oleh
// aplikasi android toko
app.listen(3000, () => {
    console.log("Server berjalan di http://localhost:3000/");
});

module.exports = app;