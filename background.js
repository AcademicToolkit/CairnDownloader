const AUTHORIZED_URL = [
    "https://shs-cairn-info.gorgone.univ-toulouse.fr/*",
    "https://stm-cairn-info.gorgone.univ-toulouse.fr/*",
    "https://droit-cairn-info.gorgone.univ-toulouse.fr/*",
    "https://shs.cairn.info/*",
    "https://droit.cairn.info/*",
    "https://stm.cairn.info/*"]


const PDF_URL_KEYWORDS = "pdf-feuilleteur"; 

const DEV = false;

let fileQueue = [];
let chapters = [];
let stateUI = 'end';
let currentIndex = 0;
let activeTabId = null;
let capturedFiles = {};
let docID = null;
let author = null;
let title = null;
let settings;


function constructUIObject(clean = false){
  if(clean){
    stateUI =   'end' ;
  }else{

  if (!chapters) return;

    const obj = chapters.map((chap, idx) => {
      let state = 'waiting';
      if (idx < currentIndex) state = 'done';
      else if (idx === currentIndex) state = 'processing';
      if (typeof chap === 'object' && chap !== null) {
        return Object.assign({}, chap, { state });
      }
      return { title: chap, state };
    });
    stateUI = obj;
  }
}

function updatePopup(clean = false){
  if(clean){
    constructUIObject(true);
  }else{
    constructUIObject();
  }

  try {
    browser.runtime.sendMessage({ action: 'pipelineUpdate', obj: stateUI });
  } catch (e) {
    console.error('updatePopup error', e);
  }
}

// 1. Network interceptor to capture the PDF in-flight
browser.webRequest.onBeforeRequest.addListener(
  function(details) {
    if (activeTabId && details.tabId === activeTabId && details.url.includes(PDF_URL_KEYWORDS)) {
      let filter = browser.webRequest.filterResponseData(details.requestId);
      let chunks = [];

      filter.ondata = event => {
        chunks.push(event.data);
        filter.write(event.data);
      };

      filter.onstop = event => {
        filter.close();
        
        // Save the binary chunk
        const blob = new Blob(chunks, { type: "application/pdf" });
        capturedFiles[currentIndex] = blob;
        
        // Move to the next page automatically
        currentIndex++;
        setTimeout(navigateToNextPage, 1000); // Be polite with the server
      };
    }
  },
  { urls: AUTHORIZED_URL },
  ["blocking"]
);

// 2. Message handler (receives commands from the content script)
browser.runtime.onMessage.addListener((message, sender) => {
  
  // Received when the user clicks the popup (via the main page's content script)
  if (message.action === "list_ok") {
    fileQueue = message.urls;
    chapters = message.chapters;
    currentIndex = 0;
    capturedFiles = {};
    activeTabId = sender.tab.id; 
    docID = message.docId;
    author = message.author;
    title = message.title;
    settings = message.settings;
    updatePopup();
    navigateToNextPage();
  }
  if (message.action === "getPipelineState") return Promise.resolve(stateUI);
  
  // Received each time a reader tab finishes loading its DOM
  if (message.action === "loaded") {
    if (activeTabId && sender.tab.id === activeTabId) {
      // Here we do nothing; let the site perform its natural fetch,
      // which will be intercepted above by webRequest.onBeforeRequest.
    }
  }
});

// 3. Controlled navigation function
function navigateToNextPage() {
  let max;
  if(DEV){
     max = 2;
  }else{
     max = fileQueue.length;
  }
  if (currentIndex < max) {
   const nextUrl = fileQueue[currentIndex];

    // Append the parameter to the end of the URL
    chrome.tabs.update(activeTabId, { url: `${nextUrl}&tab=feuilleteur` });
    updatePopup();

  } else {
    updatePopup(true);
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
