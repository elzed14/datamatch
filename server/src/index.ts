import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import xlsx from 'xlsx'
import ExcelJS from 'exceljs'
import _ from 'lodash'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import mammoth from 'mammoth'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { exec } from 'child_process'
import { promisify as promisifyUtil } from 'util'
import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const execAsync = promisifyUtil(exec)

async function launchBrowser() {
  // Windows local : utilise Chrome installé
  if (process.platform === 'win32') {
    const winPath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    return puppeteer.launch({
      executablePath: winPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
  }
  // Linux (Render) : utilise @sparticuz/chromium portable
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
    args: chromium.args
  })
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = 3001

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://client-axrjlrq2h-elzeds-projects.vercel.app',
    'https://client-elzeds-projects.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))

const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

// Health check endpoint pour wake-up automatique
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

const storage = multer.diskStorage({
  destination: function (req, file, cb) { 
    console.log('Destination upload:', uploadDir)
    cb(null, uploadDir) 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const newFilename = uniqueSuffix + '-' + file.originalname
    console.log('Nouveau nom de fichier:', newFilename)
    cb(null, newFilename)
  }
})

// Upload pour fichiers Excel/CSV
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    console.log('Fichier reçu:', file.originalname, 'Type:', file.mimetype)
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Type de fichier non supporté. Utilisez .xlsx, .xls ou .csv'))
    }
  }
})

// Upload pour tous types de fichiers (PDF, images, etc.)
const uploadAny = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
})

// Cache in memory to speed up multiple transformations/pivots on same file
const fileCache: Record<string, any> = {}

function readExcel(filename: string): any[] {
  try {
    if (fileCache[filename]) return fileCache[filename]
    const filePath = path.join(uploadDir, filename)
    console.log("Lecture du fichier:", filePath)
    
    const workbook = xlsx.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      console.warn("Pas de feuille trouvée dans", filename)
      return []
    }
    const sheet = workbook.Sheets[sheetName]
    if (!sheet) return []
    const data = xlsx.utils.sheet_to_json(sheet)
    fileCache[filename] = data as any[]
    return data as any[]
  } catch (err: any) {
    console.error("readExcel Error:", err.message)
    throw err
  }
}

/**
 * Sauvegarde des données dans un fichier Excel avec un style "Premium"
 */
async function saveStyledExcel(filename: string, data: any[], sheetName: string = 'Data') {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }] // Geler la ligne du haut
  })

  if (data.length === 0) {
    await workbook.xlsx.writeFile(path.join(uploadDir, filename))
    return
  }

  const columns = Object.keys(data[0])
  
  // Configuration des colonnes et en-têtes
  worksheet.columns = columns.map(col => ({
    header: col,
    key: col,
    width: Math.min(Math.max(col.length + 5, 12), 40) // Taille auto basique
  }))

  // Ajout des données
  worksheet.addRows(data)

  // Style de l'en-tête
  const headerRow = worksheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4338CA' } // Indigo matching the UI
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  headerRow.height = 25

  // Style des lignes (Zébrage + Bordures + Formats)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return

    // Zébrage
    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' } // Gris très clair (Slate 50)
        }
      })
    }

    // Bordures et Alignement
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      }

      // Formatage automatique des nombres
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00'
        cell.alignment = { horizontal: 'right' }
      }
    })
  })

  // Activer l'Auto-Filtre sur toutes les colonnes
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  }

  await workbook.xlsx.writeFile(path.join(uploadDir, filename))
}
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      console.error('Aucun fichier reçu dans la requête')
      return res.status(400).json({ error: 'Aucun fichier uploadé.' })
    }
    console.log("Uploaded file:", req.file.filename, "original:", req.file.originalname)
    console.log("File path:", path.join(uploadDir, req.file.filename))
    console.log("File size:", req.file.size, "bytes")
    
    const data = readExcel(req.file.filename)
    console.log("Data rows:", data.length)
    const columns = data.length > 0 ? Object.keys(data[0] as object) : []
    console.log("Columns:", columns.length)
    
    res.json({
      success: true,
      originalName: req.file.originalname,
      filename: req.file.filename,
      columns,
      previewData: data.slice(0, 10),
      totalRows: data.length
    })
  } catch (error: any) {
    console.error("Erreur upload:", error.message, error.stack)
    res.status(500).json({ error: "Erreur lecture: " + error.message })
  }
})

// ─── Extraction PDF → Excel ──────────────────────────────────────────────
app.post('/api/extract-pdf', uploadAny.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier PDF uploadé.' })
    }

    const filePath = path.join(uploadDir, req.file.filename)
    const dataBuffer = fs.readFileSync(filePath)
    
    // Convertir Buffer en Uint8Array pour pdfjs-dist
    const uint8Array = new Uint8Array(dataBuffer)
    
    // Parser le PDF avec pdfjs-dist
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array })
    const pdfDocument = await loadingTask.promise
    
    let fullText = ''
    
    // Extraire le texte de toutes les pages
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map((item: any) => item.str).join(' ')
      fullText += pageText + '\n'
    }
    
    const text = fullText

    // Extraire les tableaux du texte
    const lines = text.split('\n').filter(line => line.trim())
    
    // Détecter les lignes qui ressemblent à des tableaux (contiennent plusieurs espaces ou tabs)
    const tableLines = lines.filter(line => {
      const parts = line.split(/\s{2,}|\t/).filter(p => p.trim())
      return parts.length >= 2
    })

    if (tableLines.length === 0) {
      return res.json({
        success: true,
        message: 'Aucun tableau détecté. Extraction du texte brut.',
        data: lines.map(line => ({ Texte: line })),
        columns: ['Texte'],
        totalRows: lines.length
      })
    }

    // Extraire les colonnes de la première ligne
    const headerParts = tableLines[0].split(/\s{2,}|\t/).filter(p => p.trim())
    const columns = headerParts.length > 0 ? headerParts : ['Colonne1', 'Colonne2', 'Colonne3']

    // Extraire les données
    const data: any[] = []
    for (let i = 1; i < tableLines.length; i++) {
      const parts = tableLines[i].split(/\s{2,}|\t/).filter(p => p.trim())
      if (parts.length > 0) {
        const row: any = {}
        columns.forEach((col, idx) => {
          row[col] = parts[idx] || ''
        })
        data.push(row)
      }
    }

    // Sauvegarder en Excel
    const excelFilename = `pdf-extracted-${Date.now()}.xlsx`
    await saveStyledExcel(excelFilename, data, 'Données PDF')
    fileCache[excelFilename] = data

    res.json({
      success: true,
      originalName: req.file.originalname,
      filename: excelFilename,
      columns,
      previewData: data.slice(0, 10),
      totalRows: data.length,
      message: `${data.length} lignes extraites du PDF`
    })
  } catch (error: any) {
    console.error('Erreur extraction PDF:', error)
    res.status(500).json({ error: 'Erreur lors de l\'extraction du PDF: ' + error.message })
  }
})

// ─── Préparation Image pour OCR ──────────────────────────────────────────
app.post('/api/prepare-image', uploadAny.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucune image uploadée.' })
    }

    const filePath = path.join(uploadDir, req.file.filename)
    
    // Optimiser l'image pour l'OCR
    const optimizedFilename = `optimized-${req.file.filename}.png`
    const optimizedPath = path.join(uploadDir, optimizedFilename)
    
    await sharp(filePath)
      .greyscale() // Convertir en niveaux de gris
      .normalize() // Améliorer le contraste
      .sharpen() // Améliorer la netteté
      .png() // Convertir en PNG
      .toFile(optimizedPath)

    // Retourner l'URL de l'image optimisée pour l'OCR côté client
    res.json({
      success: true,
      originalName: req.file.originalname,
      optimizedFilename,
      message: 'Image préparée pour OCR'
    })
  } catch (error: any) {
    console.error('Erreur préparation image:', error)
    res.status(500).json({ error: 'Erreur lors de la préparation de l\'image: ' + error.message })
  }
})

// ─── Sauvegarder les données OCR ─────────────────────────────────────────
app.post('/api/save-ocr-data', async (req, res) => {
  try {
    const { data, originalName } = req.body
    
    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à sauvegarder.' })
    }

    const excelFilename = `ocr-${Date.now()}.xlsx`
    await saveStyledExcel(excelFilename, data, 'Données OCR')
    fileCache[excelFilename] = data

    const columns = data.length > 0 ? Object.keys(data[0]) : []

    res.json({
      success: true,
      originalName,
      filename: excelFilename,
      columns,
      previewData: data.slice(0, 10),
      totalRows: data.length
    })
  } catch (error: any) {
    console.error('Erreur sauvegarde OCR:', error)
    res.status(500).json({ error: 'Erreur lors de la sauvegarde: ' + error.message })
  }
})

app.post('/api/merge', (req, res) => {
  const { 
    file1, file2, 
    keys1 = [], keys2 = [], // Now using arrays for composite keys
    joinType, 
    suffix1 = ' (F1)', suffix2 = ' (F2)',
    labelBoth = 'Présent dans les deux',
    labelF1 = 'Absent fichier 2',
    labelF2 = 'Nouveau (Seulement F2)'
  } = req.body

  try {
    const data1 = readExcel(file1)
    const data2 = readExcel(file2)
    let mergedData: any[] = []

    const getK = (row: any, keys: string[]) => keys.map(k => String(row[k] ?? '').trim().toLowerCase()).join('||')

    const data2ByKey = _.keyBy(data2, r => getK(r, keys2))
    const data1ByKey = _.keyBy(data1, r => getK(r, keys1))

    // Determine colliding columns
    const cols1 = data1.length > 0 ? Object.keys(data1[0]) : [];
    const cols2 = data2.length > 0 ? Object.keys(data2[0]) : [];
    
    // Check if column is a key column
    const isKey1 = (c: string) => keys1.includes(c);
    const isKey2 = (c: string) => keys2.includes(c);

    const commonCols = new Set(cols1.filter(c => cols2.includes(c) && !isKey1(c) && !isKey2(c)));
    
    // Choose the key column name(s) for the output
    // If keys1 and keys2 are exactly identical sequentially, we just use keys1 names.
    // Otherwise we output all from keys1 and keys2 to avoid data loss.
    const keysAreSame = keys1.join('|') === keys2.join('|')

    const processRow = (row1: any, row2: any) => {
      const out: any = {};
      
      // Inject keys as they are
      if (keysAreSame) {
        keys1.forEach((k: string) => {
            out[k] = (row1 ? row1[k] : null) || (row2 ? row2[k] : null) || '';
        })
      } else {
        if (row1) keys1.forEach((k: string) => out[`${k} (Clé 1)`] = row1[k] || '');
        if (row2) keys2.forEach((k: string) => out[`${k} (Clé 2)`] = row2[k] || '');
        if (!row1) keys1.forEach((k: string) => out[`${k} (Clé 1)`] = '');
        if (!row2) keys2.forEach((k: string) => out[`${k} (Clé 2)`] = '');
      }

      // Add status first for better visibility
      if (row1 && row2) out['Statut de présence'] = labelBoth;
      else if (row1) out['Statut de présence'] = labelF1;
      else out['Statut de présence'] = labelF2;

      // Add ALL columns from file 1 with suffix (except keys)
      Object.keys(row1 || {}).forEach(k => {
        if (!isKey1(k)) {
          out[`${k}${suffix1}`] = row1 ? row1[k] : '';
        }
      });

      // Add ALL columns from file 2 with suffix (except keys)
      Object.keys(row2 || {}).forEach(k => {
        if (!isKey2(k)) {
          out[`${k}${suffix2}`] = row2 ? row2[k] : '';
        }
      });

      // For missing rows, add empty columns from the other file
      if (!row1 && row2) {
        cols1.forEach(k => {
          if (!isKey1(k) && !out[`${k}${suffix1}`]) {
            out[`${k}${suffix1}`] = '';
          }
        });
      }
      if (!row2 && row1) {
        cols2.forEach(k => {
          if (!isKey2(k) && !out[`${k}${suffix2}`]) {
            out[`${k}${suffix2}`] = '';
          }
        });
      }

      // Calculate variations for common numeric columns
      if (row1 && row2) {
        commonCols.forEach(k => {
          const str1 = String(row1[k] ?? '').replace(/\s/g, '').replace(',', '.');
          const str2 = String(row2[k] ?? '').replace(/\s/g, '').replace(',', '.');
          if (str1 !== '' && str2 !== '') {
            const v1 = Number(str1);
            const v2 = Number(str2);
            if (!isNaN(v1) && !isNaN(v2)) {
               const evolution = v2 - v1;
               out[`Évolution ${k} (+/-)`] = evolution;
               // Add percentage if values are not zero
               if (v1 !== 0) {
                 out[`Évolution ${k} (%)`] = Math.round((evolution / v1) * 10000) / 100;
               }
            }
          }
        });
      }

      return out;
    };

    if (joinType === 'INNER JOIN') {
      mergedData = data1.filter(row1 => data2ByKey[getK(row1, keys1)])
                        .map(row1 => processRow(row1, data2ByKey[getK(row1, keys1)]))
    } else if (joinType === 'LEFT JOIN') {
      mergedData = data1.map(row1 => processRow(row1, data2ByKey[getK(row1, keys1)]))
    } else if (joinType === 'RIGHT JOIN') {
      mergedData = data2.map(row2 => processRow(data1ByKey[getK(row2, keys2)], row2))
    } else if (joinType === 'FULL JOIN' || joinType === 'FULL OUTER JOIN') {
      const allKeys = new Set([
        ...data1.map(r => getK(r, keys1)),
        ...data2.map(r => getK(r, keys2))
      ])
      allKeys.forEach(k => {
        if (k) {
           mergedData.push(processRow(data1ByKey[k], data2ByKey[k]))
        }
      })
      const noKey1 = data1.filter(r => !getK(r, keys1))
      const noKey2 = data2.filter(r => !getK(r, keys2))
      noKey1.forEach(r => mergedData.push(processRow(r, undefined)))
      noKey2.forEach(r => mergedData.push(processRow(undefined, r)))
    }

    const mergedFileName = 'merged-' + Date.now() + '.xlsx'
    console.log("Merge complete - rows:", mergedData.length, "first row keys:", mergedData[0] ? Object.keys(mergedData[0]) : 'empty')
    
    // Debug: show first 3 rows' status
    for (let i = 0; i < Math.min(3, mergedData.length); i++) {
      console.log(`Row ${i} status:`, mergedData[i]['Statut de présence'])
    }
    
    saveStyledExcel(mergedFileName, mergedData, "Résultats Fusion").then(() => {
        fileCache[mergedFileName] = mergedData
        const columns = mergedData.length > 0 ? Object.keys(mergedData[0] as object) : []
        
        res.json({
          success: true,
          filename: mergedFileName,
          columns,
          previewData: mergedData.slice(0, 10),
          totalRows: mergedData.length
        })
    }).catch(err => {
        console.error("Style Error:", err);
        res.status(500).json({ error: "Erreur lors de la génération du fichier stylisé." })
    })
  } catch (error) {
    console.error("Erreur merge:", error);
    res.status(500).json({ error: "Erreur lors de la jointure." })
  }
})

// Endpoint pour télécharger un fichier Excel brut généré/uploadé
app.get('/api/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename
    const filepath = path.join(uploadDir, filename)
    if (fs.existsSync(filepath)) {
      res.download(filepath, filename)
    } else {
      res.status(404).json({ error: "Fichier introuvable." })
    }
  } catch (e) {
    res.status(500).json({ error: "Erreur serveur." })
  }
})

// Endpoint pour détecter les clés de jointure possibles entre deux fichiers
app.post('/api/analyze-keys', (req, res) => {
  const { file1, file2 } = req.body
  try {
    const data1 = readExcel(file1)
    const data2 = readExcel(file2)
    
    if (data1.length === 0 || data2.length === 0) {
      return res.status(400).json({ error: "Un des fichiers est vide." })
    }
    
    const cols1 = Object.keys(data1[0])
    const cols2 = Object.keys(data2[0])
    const commonCols = cols1.filter(c => cols2.includes(c))
    
    const analysis: Record<string, { 
      commonCount: number; 
      file1Unique: number; 
      file2Unique: number; 
      matchPercent: number;
      sampleMatches: string[];
    }> = {}
    
    for (const col of commonCols) {
      const values1 = new Set(data1.map(r => String(r[col] ?? '').trim()).filter(v => v))
      const values2 = new Set(data2.map(r => String(r[col] ?? '').trim()).filter(v => v))
      
      const commonValues = new Set([...values1].filter(v => values2.has(v)))
      const matchPercent = values1.size > 0 ? (commonValues.size / values1.size) * 100 : 0
      
      analysis[col] = {
        commonCount: commonValues.size,
        file1Unique: values1.size,
        file2Unique: values2.size,
        matchPercent: Math.round(matchPercent * 10) / 10,
        sampleMatches: Array.from(commonValues).slice(0, 5)
      }
    }
    
    // Trier par pourcentage de correspondance
    const sortedCols = Object.entries(analysis)
      .sort((a, b) => b[1].matchPercent - a[1].matchPercent)
      .map(([col, data]) => ({ column: col, ...data }))
    
    res.json({ 
      success: true, 
      commonColumns: sortedCols,
      columns1: cols1,
      columns2: cols2
    })
  } catch (error: any) {
    console.error("Erreur analyze-keys:", error.message)
    res.status(500).json({ error: error.message })
  }
})

// Moteur de TCD (Pivot Table) simple : retourne les données groupées / aplaties pour faciliter l'affichage frontend
app.post('/api/pivot', (req, res) => {
  const { filename, rowFields = [], colFields = [], valFields = [] } = req.body
  try {
    const data = readExcel(filename)
    // 1. Group by Rows
    // Build a unique key combining row fields for each record
    let grouped = _.groupBy(data, item => {
      return rowFields.map((f: string) => item[f] || 'Vide').join(' || ')
    })

    // 2. Aggregate values
    const pivotResult: any[] = []
    
    Object.keys(grouped).forEach(rowKey => {
      const groupData = grouped[rowKey]
      if (!groupData) return
      const rowItem: any = { _rowKey: rowKey, _count: groupData.length }
      
      // Breakdown by colFields if any
      if (colFields.length > 0) {
        const colGrouped = _.groupBy(groupData, item => colFields.map((f: string) => item[f] || 'Vide').join(' || '))
        Object.keys(colGrouped).forEach(colKey => {
          const colItems = colGrouped[colKey]
          if (!colItems) return
          valFields.forEach((v: any) => {
            const vals = colItems.map(i => Number(i[v.field]) || 0)
            let aggVal = 0
            if (v.agg === 'SUM') aggVal = _.sum(vals)
            else if (v.agg === 'AVG') aggVal = _.sum(vals) / (vals.length || 1)
            else if (v.agg === 'MAX') aggVal = _.max(vals) || 0
            else if (v.agg === 'MIN') aggVal = _.min(vals) || 0
            else if (v.agg === 'COUNT') aggVal = vals.length
            
            rowItem[`${colKey} - ${v.field} (${v.agg})`] = aggVal
          })
        })
      }

      // Grand totals per row for values
      valFields.forEach((v: any) => {
        const vals = groupData.map(i => Number(i[v.field]) || 0)
        let aggVal = 0
        if (v.agg === 'SUM') aggVal = _.sum(vals)
        else if (v.agg === 'AVG') aggVal = _.sum(vals) / (vals.length || 1)
        else if (v.agg === 'MAX') aggVal = _.max(vals) || 0
        else if (v.agg === 'MIN') aggVal = _.min(vals) || 0
        else if (v.agg === 'COUNT') aggVal = vals.length
        
        rowItem[`Grand Total - ${v.field} (${v.agg})`] = aggVal
      })
      
      pivotResult.push(rowItem)
    })

    res.json({
      success: true,
      data: pivotResult
    })
  } catch (err: any) {
    console.error("Erreur Pivot:", err)
    res.status(500).json({ error: err.message })
  }
})


// ─── Export Excel multi-feuilles ──────────────────────────────────────────
// Accepts: { sheets: [{ name: string, data: object[] }] }
// Returns: an .xlsx file as binary download
app.post('/api/export', async (req, res) => {
  try {
    const { sheets, filename: outName } = req.body as {
      sheets: { name: string; data: Record<string, unknown>[] }[]
      filename?: string
    }

    if (!sheets || sheets.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à exporter.' })
    }

    const workbook = new ExcelJS.Workbook()
    
    for (const sheet of sheets) {
        const safeName = sheet.name.replace(/[\\/*?[\]:]/g, '').slice(0, 31)
        const ws = workbook.addWorksheet(safeName, {
            views: [{ state: 'frozen', ySplit: 1 }]
        })

        if (sheet.data.length > 0) {
            const columns = Object.keys(sheet.data[0])
            ws.columns = columns.map(col => ({
                header: col,
                key: col,
                width: Math.min(Math.max(col.length + 5, 12), 40)
            }))
            ws.addRows(sheet.data)

            // Styling header
            const headerRow = ws.getRow(1)
            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }
                cell.alignment = { horizontal: 'center' }
            })

             // Zebra stripes & Formatting
            ws.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return
                if (rowNumber % 2 === 0) {
                    row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } } })
                }
                row.eachCell(c => {
                    if (typeof c.value === 'number') { c.numFmt = '#,##0.00'; c.alignment = { horizontal: 'right' } }
                    c.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    }
                })
            })

            ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
        }
    }

    const downloadName = (outName || 'DataMatch_Export') + '.xlsx'
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`)
    
    const buffer = await workbook.xlsx.writeBuffer()
    res.send(buffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur export'
    console.error('Erreur export:', msg)
    res.status(500).json({ error: msg })
  }
})
// ─── Data Profiling (Santé de la donnée) ──────────────────────────────────
app.post('/api/profile', (req, res) => {
  const { filename } = req.body
  try {
    const data = readExcel(filename)
    if (!data || data.length === 0) return res.json({ profile: {}, totalRows: 0 })

    const firstRow = data[0]
    if (!firstRow) return res.json({ profile: {}, totalRows: 0 })

    const columns = Object.keys(firstRow)
    const profile: any = {}
    const totalRows = data.length

    columns.forEach(col => {
      const vals = data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '')
      const missingCount = totalRows - vals.length
      
      // Basic type detection
      let type = 'string'
      const numericVals = vals.map(v => Number(String(v).replace(',', '.'))).filter(v => !isNaN(v))
      if (numericVals.length > 0 && numericVals.length === vals.length) {
        type = 'numeric'
      } else {
        const dateVals = vals.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime()))
        if (dateVals.length > 0 && dateVals.length === vals.length) type = 'date'
      }

      profile[col] = {
        type,
        missingCount,
        missingPercent: (missingCount / totalRows) * 100,
        uniqueCount: _.uniq(vals).length,
      }

      if (type === 'numeric') {
        profile[col].min = _.min(numericVals)
        profile[col].max = _.max(numericVals)
        profile[col].avg = _.sum(numericVals) / (numericVals.length || 1)
      }
    })

    res.json({ success: true, profile, totalRows })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Data Cleansing (Nettoyage) ───────────────────────────────────────────
app.post('/api/clean', (req, res) => {
  const { filename, column, action, value } = req.body
  try {
    let data = [...readExcel(filename)]
    let newFilename = `cleaned-${Date.now()}-${filename}`

    if (action === 'deduplicate') {
      data = _.uniqBy(data, column || undefined)
    } else if (action === 'trim' && column) {
      data.forEach(r => { if (typeof r[column] === 'string') r[column] = r[column].trim() })
    } else if (action === 'uppercase' && column) {
      data.forEach(r => { if (typeof r[column] === 'string') r[column] = r[column].toUpperCase() })
    } else if (action === 'lowercase' && column) {
      data.forEach(r => { if (typeof r[column] === 'string') r[column] = r[column].toLowerCase() })
    } else if (action === 'fill_null' && column) {
      data.forEach(r => { if (r[column] === null || r[column] === undefined || r[column] === '') r[column] = value })
    } else if (action === 'remove_rows_with_null' && column) {
      data = data.filter(r => r[column] !== null && r[column] !== undefined && r[column] !== '')
    }

    // Save cleaned file
    saveStyledExcel(newFilename, data, "Données Nettoyées").then(() => {
        fileCache[newFilename] = data
        res.json({
          success: true,
          filename: newFilename,
          totalRows: data.length,
          previewData: data.slice(0, 10),
          columns: data.length > 0 ? Object.keys(data[0] as object) : []
        })
    }).catch(err => {
        res.status(500).json({ error: "Erreur style nettoyage: " + err.message })
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})


app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`)
})

// ─── CONVERSION DE FICHIERS ───────────────────────────────────────────────

// Formats supportés :
// Word (.docx) → PDF, Excel, TXT
// PDF → Excel, Word (.docx), TXT, Images (PNG)
// Excel (.xlsx) → PDF, CSV, JSON, Word
// Image (PNG/JPG) → PDF, WebP, JPEG, PNG
// CSV → Excel, JSON

app.post('/api/convert', uploadAny.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni.' })
    const { targetFormat } = req.body
    if (!targetFormat) return res.status(400).json({ error: 'Format cible manquant.' })

    const filePath = path.join(uploadDir, req.file.filename)
    const originalExt = path.extname(req.file.originalname).toLowerCase().replace('.', '')
    const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname))
    const outputFilename = `converted-${Date.now()}-${baseName}.${targetFormat}`
    const outputPath = path.join(uploadDir, outputFilename)
    console.log(`Conversion: ${originalExt} -> ${targetFormat}`)

    // Helper LibreOffice CLI
    const convertWithLibreOffice = async (ext: string): Promise<boolean> => {
      try {
        await execAsync(`libreoffice --headless --convert-to ${ext} --outdir "${uploadDir}" "${filePath}"`)
        const loOutput = path.join(uploadDir, path.basename(filePath, path.extname(filePath)) + `.${ext}`)
        if (fs.existsSync(loOutput)) { fs.renameSync(loOutput, outputPath); return true }
        return false
      } catch { return false }
    }

    // Word -> PDF
    if ((originalExt === 'docx' || originalExt === 'doc') && targetFormat === 'pdf') {
      const ok = await convertWithLibreOffice('pdf')
      if (ok) return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: 'Word converti en PDF (mise en forme preservee)' })
      const { value: htmlContent } = await mammoth.convertToHtml({ buffer: fs.readFileSync(filePath) })
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>@page{margin:2.5cm;size:A4}body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#000;margin:0}h1{font-size:18pt;font-weight:bold;margin:12pt 0 6pt}h2{font-size:16pt;font-weight:bold;margin:10pt 0 4pt}h3{font-size:14pt;font-weight:bold;margin:8pt 0 4pt}p{margin:0 0 8pt;text-align:justify}table{border-collapse:collapse;width:100%;margin:8pt 0}td,th{border:1px solid #000;padding:4pt 6pt;font-size:10pt}th{background:#f0f0f0;font-weight:bold}ul,ol{margin:4pt 0 8pt 20pt}li{margin-bottom:4pt}img{max-width:100%;height:auto}</style></head><body>${htmlContent}</body></html>`
      const browser = await launchBrowser()
      const pg = await browser.newPage()
      await pg.setContent(html, { waitUntil: 'networkidle0' })
      const pdfBuf = await pg.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' } })
      await browser.close()
      fs.writeFileSync(outputPath, pdfBuf)
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: 'Word converti en PDF via Puppeteer' })
    }

    // Word -> TXT
    if ((originalExt === 'docx' || originalExt === 'doc') && targetFormat === 'txt') {
      const { value: text } = await mammoth.extractRawText({ buffer: fs.readFileSync(filePath) })
      fs.writeFileSync(outputPath, text, 'utf-8')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: 'Texte extrait avec succes' })
    }

    // Word -> Excel
    if ((originalExt === 'docx' || originalExt === 'doc') && targetFormat === 'xlsx') {
      const { value: text } = await mammoth.extractRawText({ buffer: fs.readFileSync(filePath) })
      const lines = text.split('\n').filter((l: string) => l.trim())
      const data = lines.map((line: string, i: number) => ({ 'Ligne': i + 1, 'Contenu': line }))
      await saveStyledExcel(outputFilename, data, 'Contenu Word')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${lines.length} lignes extraites` })
    }

    // PDF -> Word
    if (originalExt === 'pdf' && targetFormat === 'docx') {
      const ok = await convertWithLibreOffice('docx')
      if (ok) return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: 'PDF converti en Word (mise en forme preservee)' })

      // Fallback: reconstruction structurelle via positions pdfjs
      const dataBuffer = fs.readFileSync(filePath)
      const pdfDoc2 = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise
      const docChildren: (Paragraph | Table)[] = [
        new Paragraph({ children: [new TextRun({ text: baseName, bold: true, size: 32, color: '4338CA' })], spacing: { after: 300 } })
      ]

      for (let p = 1; p <= pdfDoc2.numPages; p++) {
        docChildren.push(new Paragraph({ children: [new TextRun({ text: `Page ${p}`, bold: true, size: 24, color: '6366f1' })], spacing: { before: 200, after: 100 } }))
        const pg = await pdfDoc2.getPage(p)
        const tc = await pg.getTextContent()
        const viewport = pg.getViewport({ scale: 1 })

        // Grouper les items par ligne (Y arrondi à 2px près)
        const lineMap: Map<number, { x: number; text: string }[]> = new Map()
        for (const item of tc.items as any[]) {
          if (!item.str?.trim()) continue
          const y = Math.round((viewport.height - item.transform[5]) / 2) * 2
          const x = Math.round(item.transform[4])
          if (!lineMap.has(y)) lineMap.set(y, [])
          lineMap.get(y)!.push({ x, text: item.str })
        }

        // Trier les lignes par Y croissant
        const sortedLines = [...lineMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, items]) => items.sort((a, b) => a.x - b.x))

        // Détecter si c'est un tableau : >= 2 colonnes sur >= 3 lignes consécutives
        const colCounts = sortedLines.map(l => l.length)
        const isTable = sortedLines.length >= 3 && colCounts.filter(c => c >= 2).length >= sortedLines.length * 0.6

        if (isTable) {
          // Déterminer le nombre max de colonnes
          const maxCols = Math.max(...colCounts)
          const tableRows = sortedLines.map((line, i) => {
            const cells = Array.from({ length: maxCols }, (_, ci) => {
              const cellText = line[ci]?.text ?? ''
              return new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: cellText, bold: i === 0, size: i === 0 ? 18 : 16 })] })],
                shading: i === 0 ? { fill: 'E8EAF6' } : { fill: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF' },
                width: { size: Math.floor(9000 / maxCols), type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                  right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
                }
              })
            })
            return new TableRow({ children: cells })
          })
          docChildren.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }))
          docChildren.push(new Paragraph({ children: [] }))
        } else {
          // Texte normal : joindre les items de chaque ligne
          for (const line of sortedLines) {
            const text = line.map(i => i.text).join(' ').trim()
            if (text) docChildren.push(new Paragraph({ children: [new TextRun({ text, size: 22 })], spacing: { after: 60 } }))
          }
        }
      }

      const doc = new Document({ sections: [{ properties: {}, children: docChildren }] })
      fs.writeFileSync(outputPath, await Packer.toBuffer(doc))
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${pdfDoc2.numPages} page(s) converties en Word avec tableaux` })
    }

    // PDF -> Excel
    if (originalExt === 'pdf' && targetFormat === 'xlsx') {
      const dataBuffer = fs.readFileSync(filePath)
      const pdfDoc2 = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise
      const allData: any[] = []
      for (let p = 1; p <= pdfDoc2.numPages; p++) {
        const pg = await pdfDoc2.getPage(p)
        const tc = await pg.getTextContent()
        tc.items.map((item: any) => item.str).join(' ').split(/\s{3,}/).filter((l: string) => l.trim())
          .forEach((line: string) => allData.push({ 'Page': p, 'Contenu': line.trim() }))
      }
      if (allData.length === 0) allData.push({ 'Page': 1, 'Contenu': 'Aucun texte extrait' })
      await saveStyledExcel(outputFilename, allData, 'Donnees PDF')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${allData.length} lignes extraites du PDF` })
    }

    // PDF -> TXT
    if (originalExt === 'pdf' && targetFormat === 'txt') {
      const dataBuffer = fs.readFileSync(filePath)
      const pdfDoc2 = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise
      let fullText = ''
      for (let p = 1; p <= pdfDoc2.numPages; p++) {
        const pg = await pdfDoc2.getPage(p)
        const tc = await pg.getTextContent()
        fullText += `\n--- Page ${p} ---\n` + tc.items.map((item: any) => item.str).join(' ') + '\n'
      }
      fs.writeFileSync(outputPath, fullText, 'utf-8')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${pdfDoc2.numPages} page(s) extraite(s)` })
    }

    // Excel -> PDF
    if ((originalExt === 'xlsx' || originalExt === 'xls') && targetFormat === 'pdf') {
      const ok = await convertWithLibreOffice('pdf')
      if (ok) { const data = readExcel(req.file.filename); return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${data.length} lignes converties en PDF` }) }
      const data = readExcel(req.file.filename)
      if (data.length === 0) return res.status(400).json({ error: 'Fichier Excel vide.' })
      const columns = Object.keys(data[0])
      const headerHtml = columns.map(c => `<th>${c}</th>`).join('')
      const rowsHtml = data.map((row: any, i: number) => `<tr class="${i % 2 === 0 ? 'even' : ''}">${columns.map(c => `<td>${row[c] ?? ''}</td>`).join('')}</tr>`).join('')
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:9px;margin:20px}table{border-collapse:collapse;width:100%}th{background:#4338CA;color:#fff;padding:6px 8px;text-align:left}td{padding:4px 8px;border-bottom:1px solid #E2E8F0}tr.even td{background:#F8FAFC}</style></head><body><h2>${baseName}</h2><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
      const browser = await launchBrowser()
      const pg = await browser.newPage()
      await pg.setContent(html, { waitUntil: 'networkidle0' })
      const pdfBuf = await pg.pdf({ format: 'A4', landscape: columns.length > 6, printBackground: true, margin: { top: '15mm', bottom: '15mm', left: '10mm', right: '10mm' } })
      await browser.close()
      fs.writeFileSync(outputPath, pdfBuf)
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${data.length} lignes converties en PDF via Puppeteer` })
    }

    // Excel -> CSV
    if ((originalExt === 'xlsx' || originalExt === 'xls') && targetFormat === 'csv') {
      const data = readExcel(req.file.filename)
      if (data.length === 0) return res.status(400).json({ error: 'Fichier Excel vide.' })
      const columns = Object.keys(data[0])
      let csv = columns.join(';') + '\n'
      data.forEach((row: any) => { csv += columns.map(c => { const v = String(row[c] ?? ''); return v.includes(';') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v }).join(';') + '\n' })
      fs.writeFileSync(outputPath, '\uFEFF' + csv, 'utf-8')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${data.length} lignes exportees en CSV` })
    }

    // Excel -> JSON
    if ((originalExt === 'xlsx' || originalExt === 'xls') && targetFormat === 'json') {
      const data = readExcel(req.file.filename)
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${data.length} enregistrements exportes en JSON` })
    }

    // Excel -> Word
    if ((originalExt === 'xlsx' || originalExt === 'xls') && targetFormat === 'docx') {
      const data = readExcel(req.file.filename)
      if (data.length === 0) return res.status(400).json({ error: 'Fichier Excel vide.' })
      const columns = Object.keys(data[0])
      const tableRows = [
        new TableRow({ children: columns.map(col => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: col, bold: true, color: 'FFFFFF', size: 18 })] })], shading: { fill: '4338CA' }, width: { size: Math.floor(9000 / columns.length), type: WidthType.DXA } })) }),
        ...data.slice(0, 500).map((row: any, i: number) => new TableRow({ children: columns.map(col => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(row[col] ?? ''), size: 16 })] })], shading: { fill: i % 2 === 0 ? 'F8FAFC' : 'FFFFFF' }, width: { size: Math.floor(9000 / columns.length), type: WidthType.DXA } })) }))
      ]
      const doc = new Document({ sections: [{ properties: {}, children: [
        new Paragraph({ children: [new TextRun({ text: baseName, bold: true, size: 36, color: '4338CA' })], spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `${data.length} lignes - ${columns.length} colonnes`, size: 18, color: '6B7280' })], spacing: { after: 400 } }),
        new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } })
      ] }] })
      fs.writeFileSync(outputPath, await Packer.toBuffer(doc))
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${Math.min(data.length, 500)} lignes converties en Word` })
    }

    // CSV -> Excel
    if (originalExt === 'csv' && targetFormat === 'xlsx') {
      const data = readExcel(req.file.filename)
      await saveStyledExcel(outputFilename, data, 'Donnees CSV')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${data.length} lignes converties en Excel` })
    }

    // CSV -> JSON
    if (originalExt === 'csv' && targetFormat === 'json') {
      const data = readExcel(req.file.filename)
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `${data.length} enregistrements en JSON` })
    }

    // Image -> PDF
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(originalExt) && targetFormat === 'pdf') {
      const pdfDoc = await PDFDocument.create()
      const optimizedBuffer = await sharp(filePath).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer()
      const jpgImage = await pdfDoc.embedJpg(optimizedBuffer)
      const { width: imgW, height: imgH } = jpgImage.scale(1)
      const scale = Math.min(595 / imgW, 842 / imgH, 1)
      const finalW = imgW * scale, finalH = imgH * scale
      const pg = pdfDoc.addPage([finalW + 40, finalH + 60])
      pg.drawImage(jpgImage, { x: 20, y: 40, width: finalW, height: finalH })
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      pg.drawText(`${baseName} - Converti par DataMatch Pro`, { x: 20, y: 15, font, size: 8, color: rgb(0.6, 0.6, 0.6) })
      fs.writeFileSync(outputPath, await pdfDoc.save())
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: 'Image convertie en PDF haute qualite' })
    }

    // Image -> Image
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(originalExt) && ['jpg', 'jpeg', 'png', 'webp'].includes(targetFormat)) {
      let s = sharp(filePath).resize({ width: 2000, withoutEnlargement: true })
      if (targetFormat === 'jpg' || targetFormat === 'jpeg') s = s.jpeg({ quality: 95 }) as any
      else if (targetFormat === 'png') s = s.png({ compressionLevel: 6 }) as any
      else if (targetFormat === 'webp') s = s.webp({ quality: 90 }) as any
      await s.toFile(outputPath)
      return res.json({ success: true, filename: outputFilename, originalFormat: originalExt, targetFormat, message: `Image convertie en ${targetFormat.toUpperCase()} haute qualite` })
    }

    // PDF -> PNG via Puppeteer
    if (originalExt === 'pdf' && targetFormat === 'png') {
      const dataBuffer = fs.readFileSync(filePath)
      const pdfDoc2 = await pdfjsLib.getDocument({ data: new Uint8Array(dataBuffer) }).promise
      const numPages = pdfDoc2.numPages
      const pdfBase64 = dataBuffer.toString('base64')
      const browser = await launchBrowser()
      const screenshots: string[] = []
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const pageHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script><style>*{margin:0;padding:0}canvas{display:block}</style></head><body><canvas id="c"></canvas><script>pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const data=atob('${pdfBase64}');const arr=new Uint8Array(data.length);for(let i=0;i<data.length;i++)arr[i]=data.charCodeAt(i);pdfjsLib.getDocument({data:arr}).promise.then(pdf=>pdf.getPage(${pageNum}).then(page=>{const vp=page.getViewport({scale:2});const canvas=document.getElementById('c');canvas.width=vp.width;canvas.height=vp.height;document.body.style.width=vp.width+'px';document.body.style.height=vp.height+'px';return page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;})).then(()=>document.title='done');</script></body></html>`
        const pg = await browser.newPage()
        await pg.setContent(pageHtml)
        await pg.waitForFunction(() => document.title === 'done', { timeout: 15000 })
        const screenshotFilename = `converted-${Date.now()}-${baseName}-page${pageNum}.png`
        await pg.screenshot({ path: path.join(uploadDir, screenshotFilename) as `${string}.png`, fullPage: false })
        await pg.close()
        screenshots.push(screenshotFilename)
      }
      await browser.close()
      return res.json({ success: true, filename: screenshots[0], files: screenshots, originalFormat: originalExt, targetFormat, message: `${numPages} page(s) converties en PNG` })
    }

    return res.status(400).json({ error: `Conversion ${originalExt} -> ${targetFormat} non supportee.` })

  } catch (error: any) {
    console.error('Erreur conversion:', error)
    res.status(500).json({ error: 'Erreur lors de la conversion: ' + error.message })
  }
})


app.get('/api/convert/download/:filename', (req, res) => {
  const filepath = path.join(uploadDir, req.params.filename)
  if (fs.existsSync(filepath)) {
    res.download(filepath)
  } else {
    res.status(404).json({ error: 'Fichier introuvable.' })
  }
})

// ─── Éditeur PDF ──────────────────────────────────────────────────────────

// Fusionner plusieurs PDFs en un seul
app.post('/api/pdf/merge', uploadAny.array('files'), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[]
    if (!files || files.length < 2) return res.status(400).json({ error: 'Au moins 2 fichiers PDF requis.' })

    const mergedPdf = await PDFDocument.create()
    for (const file of files) {
      const bytes = fs.readFileSync(path.join(uploadDir, file.filename))
      const pdf = await PDFDocument.load(bytes)
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
      pages.forEach(p => mergedPdf.addPage(p))
    }

    const outputFilename = `merged-pdf-${Date.now()}.pdf`
    fs.writeFileSync(path.join(uploadDir, outputFilename), await mergedPdf.save())
    // Nettoyer les fichiers temporaires
    files.forEach(f => fs.unlinkSync(path.join(uploadDir, f.filename)))

    res.json({ success: true, filename: outputFilename, message: `${files.length} PDFs fusionnés (${mergedPdf.getPageCount()} pages)` })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Réorganiser / supprimer des pages d'un PDF
// body: { filename, pageOrder: number[] }  (indices 0-based dans le nouvel ordre, pages absentes = supprimées)
app.post('/api/pdf/reorder', uploadAny.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis.' })
    const pageOrder: number[] = JSON.parse(req.body.pageOrder || '[]')
    if (!pageOrder.length) return res.status(400).json({ error: 'pageOrder requis.' })

    const bytes = fs.readFileSync(path.join(uploadDir, req.file.filename))
    const srcPdf = await PDFDocument.load(bytes)
    const newPdf = await PDFDocument.create()
    const copied = await newPdf.copyPages(srcPdf, pageOrder)
    copied.forEach(p => newPdf.addPage(p))

    const outputFilename = `reordered-${Date.now()}.pdf`
    fs.writeFileSync(path.join(uploadDir, outputFilename), await newPdf.save())
    fs.unlinkSync(path.join(uploadDir, req.file.filename))

    res.json({ success: true, filename: outputFilename, pageCount: newPdf.getPageCount(), message: `PDF réorganisé (${newPdf.getPageCount()} pages)` })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Diviser un PDF : extraire une plage de pages
// body: { ranges: [{start, end, name}] }  (1-based)
app.post('/api/pdf/split', uploadAny.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis.' })
    const ranges: { start: number; end: number; name?: string }[] = JSON.parse(req.body.ranges || '[]')
    if (!ranges.length) return res.status(400).json({ error: 'ranges requis.' })

    const bytes = fs.readFileSync(path.join(uploadDir, req.file.filename))
    const srcPdf = await PDFDocument.load(bytes)
    const totalPages = srcPdf.getPageCount()
    const outputs: { filename: string; name: string; pageCount: number }[] = []

    for (const range of ranges) {
      const start = Math.max(0, range.start - 1)
      const end = Math.min(totalPages - 1, range.end - 1)
      const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i)
      const newPdf = await PDFDocument.create()
      const copied = await newPdf.copyPages(srcPdf, indices)
      copied.forEach(p => newPdf.addPage(p))
      const outputFilename = `split-${Date.now()}-${range.name || `pages${range.start}-${range.end}`}.pdf`
      fs.writeFileSync(path.join(uploadDir, outputFilename), await newPdf.save())
      outputs.push({ filename: outputFilename, name: range.name || `Pages ${range.start}-${range.end}`, pageCount: newPdf.getPageCount() })
    }

    fs.unlinkSync(path.join(uploadDir, req.file.filename))
    res.json({ success: true, files: outputs, message: `${outputs.length} fichier(s) créé(s)` })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// Infos d'un PDF (nombre de pages)
app.post('/api/pdf/info', uploadAny.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis.' })
    const bytes = fs.readFileSync(path.join(uploadDir, req.file.filename))
    const pdf = await PDFDocument.load(bytes)
    res.json({ success: true, filename: req.file.filename, pageCount: pdf.getPageCount() })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Détection d'Anomalies ────────────────────────────────────────────────
app.post('/api/detect-anomalies', (req, res) => {
  const { filename, columns } = req.body
  try {
    const data = readExcel(filename)
    const anomalies: any[] = []
    let highSeverity = 0, mediumSeverity = 0, lowSeverity = 0

    columns.forEach((col: string) => {
      const values = data.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '')
      const numericValues = values.map(v => Number(String(v).replace(/\s/g, '').replace(',', '.'))).filter(v => !isNaN(v))
      
      if (numericValues.length === 0) return

      // Statistiques
      const mean = _.mean(numericValues)
      const stdDev = Math.sqrt(_.sum(numericValues.map(v => Math.pow(v - mean, 2))) / numericValues.length)
      const q1 = numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length * 0.25)]
      const q3 = numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length * 0.75)]
      const iqr = q3 - q1

      // Détection des valeurs aberrantes
      data.forEach((row, idx) => {
        const val = Number(String(row[col] || '').replace(/\s/g, '').replace(',', '.'))
        if (isNaN(val)) return

        // Méthode Z-score
        const zScore = Math.abs((val - mean) / stdDev)
        
        // Méthode IQR
        const lowerBound = q1 - 1.5 * iqr
        const upperBound = q3 + 1.5 * iqr
        const isOutlierIQR = val < lowerBound || val > upperBound

        // Valeurs négatives inattendues
        const isNegative = val < 0 && !col.toLowerCase().includes('evolution') && !col.toLowerCase().includes('écart')

        // Valeurs nulles
        const isZero = val === 0 && col.toLowerCase().includes('ca') || col.toLowerCase().includes('montant')

        let severity: 'low' | 'medium' | 'high' | null = null
        let reason = ''
        let suggestion = ''

        if (zScore > 3) {
          severity = 'high'
          reason = `Valeur extrême (Z-score: ${zScore.toFixed(2)}). Écart de ${Math.abs(val - mean).toLocaleString('fr-FR')} par rapport à la moyenne.`
          suggestion = 'Vérifier si cette valeur est correcte ou s\'il s\'agit d\'une erreur de saisie.'
          highSeverity++
        } else if (isOutlierIQR) {
          severity = 'medium'
          reason = `Valeur aberrante détectée (hors de l'intervalle interquartile).`
          suggestion = 'Cette valeur est inhabituelle mais peut être légitime. À vérifier.'
          mediumSeverity++
        } else if (isNegative) {
          severity = 'high'
          reason = 'Valeur négative inattendue pour ce type de donnée.'
          suggestion = 'Les montants et CA ne devraient pas être négatifs. Corriger la valeur.'
          highSeverity++
        } else if (isZero) {
          severity = 'low'
          reason = 'Valeur nulle pour un montant ou CA.'
          suggestion = 'Vérifier si cette ligne doit être conservée.'
          lowSeverity++
        }

        if (severity) {
          anomalies.push({
            row: idx + 2, // +2 car ligne 1 = header et index commence à 0
            column: col,
            value: val,
            reason,
            severity,
            suggestion
          })
        }
      })
    })

    // Trier par sévérité
    const severityOrder = { high: 0, medium: 1, low: 2 }
    anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    res.json({
      success: true,
      anomalies,
      stats: {
        totalRows: data.length,
        highSeverity,
        mediumSeverity,
        lowSeverity
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Graphique Waterfall ──────────────────────────────────────────────────
app.post('/api/waterfall', (req, res) => {
  const { filename, categoryColumn, valueColumn } = req.body
  try {
    const data = readExcel(filename)
    
    // Grouper par catégorie et sommer les valeurs
    const grouped = _.groupBy(data, categoryColumn)
    const chartData: any[] = []
    let cumulative = 0

    Object.keys(grouped).forEach(category => {
      const items = grouped[category]
      const sum = _.sumBy(items, item => {
        const val = Number(String(item[valueColumn] || '0').replace(/\s/g, '').replace(',', '.'))
        return isNaN(val) ? 0 : val
      })

      chartData.push({
        category,
        value: sum,
        cumulative: cumulative + sum,
        isTotal: false
      })

      cumulative += sum
    })

    // Ajouter le total final
    chartData.push({
      category: 'TOTAL',
      value: cumulative,
      cumulative,
      isTotal: true
    })

    res.json({ success: true, data: chartData })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Nettoyage Avancé ─────────────────────────────────────────────────────
app.post('/api/clean-advanced', (req, res) => {
  const { filename, rules, columns: targetColumns, fillValue } = req.body
  try {
    let data = [...readExcel(filename)]
    const rowsBefore = data.length
    let modifications = 0

    // Appliquer les règles
    rules.forEach((rule: string) => {
      switch (rule) {
        case 'trim':
          data.forEach(row => {
            targetColumns.forEach((col: string) => {
              if (typeof row[col] === 'string') {
                const before = row[col]
                row[col] = row[col].trim()
                if (before !== row[col]) modifications++
              }
            })
          })
          break

        case 'uppercase':
          data.forEach(row => {
            targetColumns.forEach((col: string) => {
              if (typeof row[col] === 'string') {
                row[col] = row[col].toUpperCase()
                modifications++
              }
            })
          })
          break

        case 'lowercase':
          data.forEach(row => {
            targetColumns.forEach((col: string) => {
              if (typeof row[col] === 'string') {
                row[col] = row[col].toLowerCase()
                modifications++
              }
            })
          })
          break

        case 'remove_accents':
          data.forEach(row => {
            targetColumns.forEach((col: string) => {
              if (typeof row[col] === 'string') {
                row[col] = row[col].normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                modifications++
              }
            })
          })
          break

        case 'remove_duplicates':
          const before = data.length
          data = _.uniqWith(data, _.isEqual)
          modifications += before - data.length
          break

        case 'fill_empty':
          data.forEach(row => {
            targetColumns.forEach((col: string) => {
              if (row[col] === null || row[col] === undefined || row[col] === '') {
                row[col] = fillValue || 'N/A'
                modifications++
              }
            })
          })
          break

        case 'remove_empty_rows':
          const beforeEmpty = data.length
          data = data.filter(row => {
            return targetColumns.some((col: string) => 
              row[col] !== null && row[col] !== undefined && row[col] !== ''
            )
          })
          modifications += beforeEmpty - data.length
          break

        case 'normalize_numbers':
          data.forEach(row => {
            targetColumns.forEach((col: string) => {
              if (row[col]) {
                const str = String(row[col]).replace(/\s/g, '').replace(',', '.')
                const num = Number(str)
                if (!isNaN(num)) {
                  row[col] = num
                  modifications++
                }
              }
            })
          })
          break

        case 'remove_special_chars':
          data.forEach(row => {
            targetColumns.forEach((col: string) => {
              if (typeof row[col] === 'string') {
                row[col] = row[col].replace(/[^a-zA-Z0-9\s]/g, '')
                modifications++
              }
            })
          })
          break
      }
    })

    const newFilename = `cleaned-advanced-${Date.now()}-${filename}`
    saveStyledExcel(newFilename, data, 'Données Nettoyées').then(() => {
      fileCache[newFilename] = data
      res.json({
        success: true,
        filename: newFilename,
        rowsBefore,
        rowsAfter: data.length,
        modifications,
        previewData: data.slice(0, 10),
        columns: data.length > 0 ? Object.keys(data[0]) : []
      })
    }).catch(err => {
      res.status(500).json({ error: err.message })
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Dashboard Personnalisable ────────────────────────────────────────────
app.post('/api/widget-data', (req, res) => {
  const { filename, dataKey, categoryKey, type } = req.body
  try {
    const data = readExcel(filename)
    
    if (type === 'stat') {
      const values = data.map(r => Number(String(r[dataKey] || '0').replace(/\s/g, '').replace(',', '.'))).filter(v => !isNaN(v))
      const total = _.sum(values)
      res.json({ success: true, data: [{ value: total }] })
    } else {
      const grouped = _.groupBy(data, categoryKey)
      const chartData = Object.keys(grouped).map(category => {
        const items = grouped[category]
        const sum = _.sumBy(items, item => {
          const val = Number(String(item[dataKey] || '0').replace(/\s/g, '').replace(',', '.'))
          return isNaN(val) ? 0 : val
        })
        return { category, value: sum }
      })
      res.json({ success: true, data: chartData })
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Analyse de Cohortes ──────────────────────────────────────────────────
app.post('/api/cohort-analysis', (req, res) => {
  const { filename, cohortColumn, dateColumn } = req.body
  try {
    const data = readExcel(filename)
    
    const cohortData: Record<string, Record<string, any[]>> = {}
    
    data.forEach(row => {
      const cohort = String(row[cohortColumn] || 'Unknown')
      const period = String(row[dateColumn] || 'Unknown')
      
      if (!cohortData[cohort]) cohortData[cohort] = {}
      if (!cohortData[cohort][period]) cohortData[cohort][period] = []
      cohortData[cohort][period].push(row)
    })

    const cohorts = Object.keys(cohortData).sort()
    const allPeriods = [...new Set(data.map(r => String(r[dateColumn])))].sort()
    
    const matrix = cohorts.map(cohort => {
      const periods = cohortData[cohort]
      const periodKeys = Object.keys(periods).sort()
      const initialSize = periods[periodKeys[0]]?.length || 0
      
      const retentions = allPeriods.map(period => {
        const count = periods[period]?.length || 0
        return initialSize > 0 ? (count / initialSize) * 100 : 0
      })

      return {
        cohort,
        initialSize,
        periods: allPeriods,
        retentions
      }
    })

    const allRetentions = matrix.flatMap(m => m.retentions.filter(r => r > 0))
    const avgRetention = _.mean(allRetentions)
    const bestCohortRetention = _.max(allRetentions)

    res.json({
      success: true,
      matrix,
      stats: {
        totalCohorts: cohorts.length,
        totalPeriods: allPeriods.length,
        avgRetention,
        bestCohortRetention
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Recherche Globale ────────────────────────────────────────────────────
app.post('/api/global-search', (req, res) => {
  const { filename, query, columns: searchColumns, filters } = req.body
  try {
    const startTime = Date.now()
    const data = readExcel(filename)
    const results: any[] = []
    const columnsMatched = new Set<string>()

    data.forEach((row, idx) => {
      let matches: Record<string, any> = {}
      let matchCount = 0
      
      searchColumns.forEach((col: string) => {
        const value = String(row[col] || '').toLowerCase()
        const queryLower = query.toLowerCase()
        
        if (filters[col]) {
          const filterValue = String(filters[col]).toLowerCase()
          if (!value.includes(filterValue)) return
        }
        
        if (value.includes(queryLower)) {
          matches[col] = row[col]
          matchCount++
          columnsMatched.add(col)
        }
      })

      if (matchCount > 0) {
        const score = Math.round((matchCount / searchColumns.length) * 100)
        results.push({
          row: idx + 2,
          matches,
          score
        })
      }
    })

    results.sort((a, b) => b.score - a.score)

    const searchTime = Date.now() - startTime
    const avgScore = results.length > 0 ? _.mean(results.map(r => r.score)) : 0

    res.json({
      success: true,
      results,
      stats: {
        totalResults: results.length,
        columnsMatched: columnsMatched.size,
        searchTime,
        avgScore
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Export Résultats de Recherche ───────────────────────────────────────
app.post('/api/export-search', async (req, res) => {
  const { results } = req.body
  try {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Résultats')

    if (results.length > 0) {
      const columns = Object.keys(results[0])
      worksheet.columns = columns.map(col => ({ header: col, key: col, width: 20 }))
      worksheet.addRows(results)

      const headerRow = worksheet.getRow(1)
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }
      })
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="search_results.xlsx"')
    
    const buffer = await workbook.xlsx.writeBuffer()
    res.send(buffer)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Exports Avancés ──────────────────────────────────────────────────────
app.post('/api/export-advanced', async (req, res) => {
  const { filename, format, template, options } = req.body
  try {
    const data = readExcel(filename)

    if (format === 'csv') {
      // Export CSV
      const delimiter = options.delimiter || ','
      const includeHeader = options.includeHeader !== false

      let csvContent = ''
      
      if (data.length > 0) {
        const columns = Object.keys(data[0])
        
        if (includeHeader) {
          csvContent += columns.join(delimiter) + '\n'
        }

        data.forEach(row => {
          const values = columns.map(col => {
            const val = row[col]
            const strVal = String(val ?? '')
            // Échapper les guillemets et entourer de guillemets si contient le délimiteur
            if (strVal.includes(delimiter) || strVal.includes('"') || strVal.includes('\n')) {
              return `"${strVal.replace(/"/g, '""')}"`
            }
            return strVal
          })
          csvContent += values.join(delimiter) + '\n'
        })
      }

      const buffer = Buffer.from(csvContent, options.encoding || 'UTF-8')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${options.fileName || 'export'}.csv"`)
      res.send(buffer)

    } else if (format === 'json') {
      // Export JSON
      const jsonData: any = {
        data
      }

      if (options.includeMetadata) {
        jsonData.metadata = {
          exportDate: new Date().toISOString(),
          totalRows: data.length,
          columns: data.length > 0 ? Object.keys(data[0]) : [],
          source: filename,
          stats: {
            numericColumns: data.length > 0 ? Object.keys(data[0]).filter(col => {
              const val = data[0][col]
              return typeof val === 'number' || !isNaN(Number(val))
            }).length : 0
          }
        }
      }

      const jsonString = options.compressJSON 
        ? JSON.stringify(jsonData)
        : JSON.stringify(jsonData, null, 2)

      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${options.fileName || 'export'}.json"`)
      res.send(jsonString)

    } else if (format === 'excel') {
      // Export Excel avec templates
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(options.sheetName || 'Données', {
        views: [{ state: 'frozen', ySplit: 1 }]
      })

      if (data.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à exporter' })
      }

      const columns = Object.keys(data[0])

      // En-tête personnalisé
      if (options.includeHeader) {
        worksheet.mergeCells('A1:' + String.fromCharCode(64 + columns.length) + '1')
        const headerCell = worksheet.getCell('A1')
        headerCell.value = options.headerTitle || 'Rapport DataMatch Pro'
        headerCell.font = { size: 16, bold: true, color: { argb: 'FF4338CA' } }
        headerCell.alignment = { horizontal: 'center', vertical: 'middle' }
        headerCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        }
        worksheet.getRow(1).height = 30

        // Date et info
        worksheet.mergeCells('A2:' + String.fromCharCode(64 + columns.length) + '2')
        const infoCell = worksheet.getCell('A2')
        infoCell.value = `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`
        infoCell.font = { size: 10, italic: true }
        infoCell.alignment = { horizontal: 'center' }
        worksheet.getRow(2).height = 20

        worksheet.addRow([]) // Ligne vide
      }

      // Colonnes de données
      const startRow = options.includeHeader ? 4 : 1
      worksheet.getRow(startRow).values = columns

      // Style des en-têtes de colonnes
      const headerRow = worksheet.getRow(startRow)
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
        
        if (options.styling === 'corporate') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
        } else if (options.styling === 'professional') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B7280' } }
        }
        
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      })
      headerRow.height = 25

      // Ajout des données
      data.forEach(row => {
        const values = columns.map(col => row[col])
        worksheet.addRow(values)
      })

      // Style des données
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= startRow) return

        // Zébrage
        if (rowNumber % 2 === 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8FAFC' }
            }
          })
        }

        row.eachCell((cell, colNumber) => {
          // Formatage des nombres
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0.00'
            cell.alignment = { horizontal: 'right' }
          }

          // Bordures
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          }
        })
      })

      // Auto-largeur des colonnes
      worksheet.columns.forEach((column, idx) => {
        const col = columns[idx]
        column.width = Math.min(Math.max(col.length + 5, 12), 40)
      })

      // Statistiques
      if (options.includeStats) {
        const statsRow = worksheet.rowCount + 2
        worksheet.getCell(`A${statsRow}`).value = 'Statistiques'
        worksheet.getCell(`A${statsRow}`).font = { bold: true, size: 12 }
        
        worksheet.getCell(`A${statsRow + 1}`).value = 'Total de lignes:'
        worksheet.getCell(`B${statsRow + 1}`).value = data.length
        
        // Calculer des stats pour colonnes numériques
        columns.forEach((col, idx) => {
          const values = data.map(r => Number(r[col])).filter(v => !isNaN(v))
          if (values.length > 0) {
            const sum = _.sum(values)
            const avg = _.mean(values)
            
            worksheet.getCell(`A${statsRow + 2 + idx}`).value = `${col} (Total):`
            worksheet.getCell(`B${statsRow + 2 + idx}`).value = sum
            worksheet.getCell(`C${statsRow + 2 + idx}`).value = `Moyenne: ${avg.toFixed(2)}`
          }
        })
      }

      // Pied de page
      if (options.includeFooter) {
        const footerRow = worksheet.rowCount + 2
        worksheet.mergeCells(`A${footerRow}:${String.fromCharCode(64 + columns.length)}${footerRow}`)
        const footerCell = worksheet.getCell(`A${footerRow}`)
        footerCell.value = '© DataMatch Pro - Rapport généré automatiquement'
        footerCell.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } }
        footerCell.alignment = { horizontal: 'center' }
      }

      // Auto-filtre
      worksheet.autoFilter = {
        from: { row: startRow, column: 1 },
        to: { row: startRow, column: columns.length }
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${options.fileName || 'export'}.xlsx"`)
      
      const buffer = await workbook.xlsx.writeBuffer()
      res.send(buffer)
    }
  } catch (err: any) {
    console.error('Erreur export avancé:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── Export de Graphiques en Image ───────────────────────────────────────
app.post('/api/export-chart', async (req, res) => {
  const { filename, chartType, column, title, format, width, height } = req.body
  try {
    const data = readExcel(filename)
    
    // Grouper et agréger les données
    const chartData: any[] = []
    const grouped = _.groupBy(data, (item, idx) => Math.floor(idx / 10)) // Grouper par 10
    
    Object.keys(grouped).forEach(key => {
      const items = grouped[key]
      const sum = _.sumBy(items, item => {
        const val = Number(String(item[column] || '0').replace(/\s/g, '').replace(',', '.'))
        return isNaN(val) ? 0 : val
      })
      chartData.push({
        category: `Groupe ${parseInt(key) + 1}`,
        value: sum
      })
    })

    // Créer un workbook Excel avec graphique
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Graphique')

    // Ajouter les données
    worksheet.addRow(['Catégorie', 'Valeur'])
    chartData.forEach(item => {
      worksheet.addRow([item.category, item.value])
    })

    // Note: ExcelJS ne supporte pas directement l'export en image
    // On crée un Excel avec le graphique que l'utilisateur peut ouvrir
    worksheet.addRow([])
    worksheet.addRow([title])

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="chart_data.xlsx"`)
    
    const buffer = await workbook.xlsx.writeBuffer()
    res.send(buffer)
  } catch (err: any) {
    console.error('Erreur export graphique:', err)
    res.status(500).json({ error: err.message })
  }
})

// ─── Pagination Intelligente ─────────────────────────────────────────────
app.post('/api/paginated-data', (req, res) => {
  const { filename, page = 1, pageSize = 50 } = req.body
  try {
    const data = readExcel(filename)
    
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedData = data.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: paginatedData,
      page,
      pageSize,
      totalRows: data.length,
      totalPages: Math.ceil(data.length / pageSize),
      hasNext: endIndex < data.length,
      hasPrev: page > 1
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Données Compressées ─────────────────────────────────────────────────
import zlib from 'zlib'
import { promisify } from 'util'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

app.post('/api/compressed-data', async (req, res) => {
  const { filename } = req.body
  try {
    const data = readExcel(filename)
    const jsonData = JSON.stringify(data)
    
    // Compresser avec gzip
    const compressed = await gzip(jsonData)
    
    res.setHeader('Content-Encoding', 'gzip')
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('X-Original-Size', jsonData.length.toString())
    res.setHeader('X-Compressed-Size', compressed.length.toString())
    res.setHeader('X-Compression-Ratio', ((1 - compressed.length / jsonData.length) * 100).toFixed(2))
    
    res.send(compressed)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Traitement en Arrière-Plan (Chunked) ────────────────────────────────
app.post('/api/process-background', async (req, res) => {
  const { filename, operation, options } = req.body
  
  try {
    const data = readExcel(filename)
    const chunkSize = 1000
    const totalChunks = Math.ceil(data.length / chunkSize)
    
    // Envoyer la réponse immédiatement avec un job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    res.json({
      success: true,
      jobId,
      totalChunks,
      message: 'Traitement démarré en arrière-plan'
    })

    // Traiter en arrière-plan
    setImmediate(async () => {
      const results: any[] = []
      
      for (let i = 0; i < totalChunks; i++) {
        const chunk = data.slice(i * chunkSize, (i + 1) * chunkSize)
        
        // Simuler un traitement
        if (operation === 'clean') {
          chunk.forEach(row => {
            Object.keys(row).forEach(key => {
              if (typeof row[key] === 'string') {
                row[key] = row[key].trim()
              }
            })
          })
        }
        
        results.push(...chunk)
        
        // Sauvegarder la progression
        const progress = ((i + 1) / totalChunks) * 100
        console.log(`Job ${jobId}: ${progress.toFixed(0)}% complété`)
      }

      // Sauvegarder le résultat
      const resultFilename = `background_${jobId}_${filename}`
      await saveStyledExcel(resultFilename, results, 'Résultats')
      fileCache[jobId] = { filename: resultFilename, completed: true, totalRows: results.length }
      
      console.log(`Job ${jobId}: Terminé`)
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Vérifier le Statut d'un Job ─────────────────────────────────────────
app.get('/api/job-status/:jobId', (req, res) => {
  const { jobId } = req.params
  const jobData = fileCache[jobId]
  
  if (jobData) {
    res.json({
      success: true,
      status: jobData.completed ? 'completed' : 'processing',
      filename: jobData.filename,
      totalRows: jobData.totalRows
    })
  } else {
    res.json({
      success: false,
      status: 'not_found'
    })
  }
})

// ─── Lazy Loading avec Scroll Infini ─────────────────────────────────────
app.post('/api/lazy-load', (req, res) => {
  const { filename, offset = 0, limit = 50 } = req.body
  try {
    const data = readExcel(filename)
    const chunk = data.slice(offset, offset + limit)
    
    res.json({
      success: true,
      data: chunk,
      offset,
      limit,
      hasMore: offset + limit < data.length,
      totalRows: data.length
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Statistiques de Performance ─────────────────────────────────────────
app.get('/api/performance-stats', (req, res) => {
  const cacheSize = Object.keys(fileCache).length
  const memoryUsage = process.memoryUsage()
  
  res.json({
    success: true,
    stats: {
      cacheEntries: cacheSize,
      memoryUsage: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB'
      },
      uptime: Math.round(process.uptime()) + ' secondes'
    }
  })
})

// ─── Suggestions Intelligentes ───────────────────────────────────────────
app.post('/api/search-suggestions', (req, res) => {
  const { filename, query, columns } = req.body
  try {
    const data = readExcel(filename)
    const suggestions: Map<string, number> = new Map()

    // Extraire les valeurs uniques qui correspondent à la requête
    columns.forEach((col: string) => {
      data.forEach(row => {
        const value = String(row[col] || '').trim()
        if (value && value.toLowerCase().includes(query.toLowerCase())) {
          suggestions.set(value, (suggestions.get(value) || 0) + 1)
        }
      })
    })

    // Trier par fréquence et limiter
    const sortedSuggestions = Array.from(suggestions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value, count]) => ({ value, count }))

    res.json({
      success: true,
      suggestions: sortedSuggestions
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Recherches Populaires ───────────────────────────────────────────────
const searchHistory: Map<string, number> = new Map()

app.post('/api/popular-searches', (req, res) => {
  try {
    // Retourner les recherches les plus fréquentes
    const popular = Array.from(searchHistory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text, count]) => ({ text, type: 'popular', count }))

    res.json({
      success: true,
      searches: popular
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// ─── Recherche Avancée avec Filtres ──────────────────────────────────────
app.post('/api/advanced-search', (req, res) => {
  const { filename, query, columns: searchColumns, advancedFilters } = req.body
  try {
    const startTime = Date.now()
    const data = readExcel(filename)
    const results: any[] = []
    const columnsMatched = new Set<string>()

    // Enregistrer la recherche dans l'historique
    if (query) {
      searchHistory.set(query, (searchHistory.get(query) || 0) + 1)
    }

    data.forEach((row, idx) => {
      let matches: Record<string, any> = {}
      let highlights: Record<string, string> = {}
      let matchCount = 0
      let passesFilters = true

      // Vérifier les filtres avancés
      if (advancedFilters && advancedFilters.length > 0) {
        for (const filter of advancedFilters) {
          const value = row[filter.column]
          const filterValue = filter.value
          const filterValue2 = filter.value2

          let passes = false

          switch (filter.operator) {
            case 'equals':
              passes = String(value).toLowerCase() === String(filterValue).toLowerCase()
              break
            case 'contains':
              passes = String(value).toLowerCase().includes(String(filterValue).toLowerCase())
              break
            case 'startsWith':
              passes = String(value).toLowerCase().startsWith(String(filterValue).toLowerCase())
              break
            case 'endsWith':
              passes = String(value).toLowerCase().endsWith(String(filterValue).toLowerCase())
              break
            case 'greaterThan':
              passes = Number(value) > Number(filterValue)
              break
            case 'lessThan':
              passes = Number(value) < Number(filterValue)
              break
            case 'between':
              passes = Number(value) >= Number(filterValue) && Number(value) <= Number(filterValue2)
              break
            case 'isEmpty':
              passes = !value || String(value).trim() === ''
              break
            case 'isNotEmpty':
              passes = value && String(value).trim() !== ''
              break
          }

          if (!passes) {
            passesFilters = false
            break
          }
        }
      }

      if (!passesFilters) return

      // Recherche textuelle
      if (query) {
        searchColumns.forEach((col: string) => {
          const value = String(row[col] || '')
          const valueLower = value.toLowerCase()
          const queryLower = query.toLowerCase()

          if (valueLower.includes(queryLower)) {
            matches[col] = row[col]
            
            // Créer le highlight HTML
            const regex = new RegExp(`(${query})`, 'gi')
            highlights[col] = value.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
            
            matchCount++
            columnsMatched.add(col)
          }
        })
      } else if (passesFilters) {
        // Si pas de query mais filtres passés, inclure toutes les colonnes
        searchColumns.forEach((col: string) => {
          matches[col] = row[col]
        })
        matchCount = 1
      }

      if (matchCount > 0 || (passesFilters && !query)) {
        const score = query ? Math.round((matchCount / searchColumns.length) * 100) : 100
        results.push({
          row: idx + 2,
          matches,
          highlights,
          score
        })
      }
    })

    // Trier par score
    results.sort((a, b) => b.score - a.score)

    const searchTime = Date.now() - startTime
    const avgScore = results.length > 0 ? _.mean(results.map(r => r.score)) : 0

    res.json({
      success: true,
      results,
      stats: {
        totalResults: results.length,
        columnsMatched: columnsMatched.size,
        searchTime,
        avgScore,
        filtersApplied: advancedFilters?.length || 0
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
