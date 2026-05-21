// 4. Compilation finale
async function genererZip(docID) {
  const zip = new JSZip();

  for (let i = 0; i < fileQueue.length; i++) {
    const blob = capturedFiles[i];
    if (blob) {
      const filename = String(i + 1).padStart(2, '0') + ".pdf";
      zip.file(filename, blob);
    }
  }

  const zipContent = await zip.generateAsync({ type: "blob" });
  const zipUrl = URL.createObjectURL(zipContent);

  browser.downloads.download({
    url: zipUrl,
    filename: docID + ".zip",
    saveAs: true
  });

  // Reset
  cleanEnv();
}

async function mergePDFs(docID, title, author){
 const { PDFDocument } = PDFLib;
//const PDFDocument  = new PDFLib();
const mergedPdf = await PDFDocument.create();

for (let i = 0; i < fileQueue.length; i++) {
  const blob = capturedFiles[i];

  if (blob) {

    // Convertir le Blob en ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer();

    // Charger le PDF
    const pdf = await PDFDocument.load(arrayBuffer);

    // Copier les pages
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

    pages.forEach(page => mergedPdf.addPage(page));
  }
}
mergedPdf.setTitle(title + ' - ' + docID);
mergedPdf.setAuthor(author);



const pdfBytes = await mergedPdf.save();

// Convertir en Blob PDF
const blob = new Blob([pdfBytes], { type: "application/pdf" });

// Créer l’URL
const url = URL.createObjectURL(blob);

// Télécharger
browser.downloads.download({
  url,
  filename: docID + ".pdf",
  saveAs: true
});

  // Reset
  cleanEnv();
}