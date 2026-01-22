const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/ilan-ekle', async (req, res) => {
  const ilan = req.body;

  try {
    const pool = await db.connect();
    await pool.request()
      .input('Baslik', sql.NVarChar, ilan.Baslik)
      .input('Fiyat', sql.Int, ilan.Fiyat)
      .input('IlanLinki', sql.NVarChar, ilan.IlanLinki)
      .input('KisiAdi', sql.NVarChar, ilan.KisiAdi)
      .input('KisiAdiMaskeli', sql.NVarChar, ilan.KisiAdiMaskeli)
      .input('Telefon', sql.NVarChar, ilan.Telefon)
      .input('TelefonMaskeli', sql.NVarChar, ilan.TelefonMaskeli)
      .query(`
        INSERT INTO ilanlar (Baslik, Fiyat, IlanLinki, KisiAdi, KisiAdiMaskeli, Telefon, TelefonMaskeli)
        VALUES (@Baslik, @Fiyat, @IlanLinki, @KisiAdi, @KisiAdiMaskeli, @Telefon, @TelefonMaskeli)
      `);

    res.status(201).json({ message: "İlan eklendi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

app.listen(3000, () => {
  console.log('API çalışıyor: http://localhost:3000');
});
