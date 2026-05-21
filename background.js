const AUTHORIZED_URL = [
    "https://shs-cairn-info.gorgone.univ-toulouse.fr/*",
    "https://stm-cairn-info.gorgone.univ-toulouse.fr/*",
    "https://droit-cairn-info.gorgone.univ-toulouse.fr/*"]


const PDF_URL_KEYWORDS = "pdf-feuilleteur"; // À adapter

const DEV = false;

let fileQueue = [];
let currentIndex = 0;
let activeTabId = null;
let capturedFiles = {};
let docID = null;
let author = null;
let title = null;
let settings;

// 1. Intercepteur réseau pour choper le PDF au vol
browser.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (activeTabId && details.tabId === activeTabId && details.url.includes(PDF_URL_KEYWORDS)) {
      console.log("Captured !:" + details.url);
      let filter = browser.webRequest.filterResponseData(details.requestId);
      let chunks = [];

      filter.ondata = event => {
        chunks.push(event.data);
        filter.write(event.data);
      };

      filter.onstop = event => {
        filter.close();
        
        // Sauvegarde du morceau binaire
        const blob = new Blob(chunks, { type: "application/pdf" });
        capturedFiles[currentIndex] = blob;
        
        // On passe à la page suivanteautomatique de la page
        currentIndex++;
        setTimeout(navigateToNextPage, 1000); // Be polite with the server
      };
    }
  },
  { urls: AUTHORIZED_URL },
  ["blocking"]
);

// 2. Gestionnaire de messages (reçoit les ordres du content script)
browser.runtime.onMessage.addListener((message, sender) => {
  
  // Reçu quand l'utilisateur clique sur la popup (via le content script de la p. principale)
  if (message.action === "list_ok") {
    fileQueue = message.urls;
    currentIndex = 0;
    capturedFiles = {};
    activeTabId = sender.tab.id; // On mémorise l'onglet de travail
    docID = message.docId;
    author = message.author;
    title = message.title;
    settings = message.settings;
    console.log(settings);
    
    navigateToNextPage();
  }
  
  // Reçu à chaque fois qu'un onglet de recette finit de charger son DOM
  if (message.action === "loaded") {
    if (activeTabId && sender.tab.id === activeTabId) {
      console.log(`Page ${currentIndex + 1} ready. Waiting fetch...`);
      // Ici, on ne fait rien, on laisse le site faire son fetch naturel, 
      // qui sera intercepté plus haut par webRequest.onBeforeRequest.
    }
  }
});

// 3. Fonction de navigation contrôlée
function navigateToNextPage() {
  let max;
  if(DEV){
     max = 2;
  }else{
     max = fileQueue.length;
  }
  if (currentIndex < max) {
   const nextUrl = fileQueue[currentIndex];

    // Ajoute le paramètre à la fin de l'URL
    chrome.tabs.update(activeTabId, { url: `${nextUrl}&tab=feuilleteur` });

  } else {
    console.log(settings);
    console.log(settings.exportType);
    if(settings.exportType == 'zip'){
      genererZip(docID);
    }else{
      mergePDFs(docID, title, author);
    }
  }
}

function cleanEnv(){

  activeTabId = null;
    fileQueue = [];
    currentIndex = 0;
    capturedFiles = {};
    docID = null;
    author = null;
    title = null;
    settings;
}
