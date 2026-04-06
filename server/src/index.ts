import express from 'express'
import cors from 'cors'
import multer from 'multer'
import xlsx from 'xlsx'
import ExcelJS from 'exceljs'
import _ from 'lodash'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const port = 3001

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://localhost:3000',
    'https://client-axrjlrq2h-elzeds-projects.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true
}))
app.use(express.json({ limit: '50mb' }))

const uploadDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

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
