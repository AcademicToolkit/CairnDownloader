// Alpine.js (alpine scp friendly) version
document.addEventListener('alpine:init', () => {
  Alpine.data('popupApp', () => ({
    activeTab: 'export',
    exportMode: 'pdf',
    history: [],
    loadingHistory: false,
    tabId : 0,
    pipelineState : 'end',
    processing : false,
    themeUI: 'auto',
    exportTypeUI : 'pdf',
    showCompletedSteps : false,
    settings: {
      theme: "auto",
      exportType: 'pdf'
    },

    // Helper translation
    t(key) { 
      return chrome.i18n.getMessage(key) || key; 
    },


    async init() {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) this.tabId = tabs[0].id;
        
        if (this.activeTab === 'history') {
          this.loadHistory();
        } else {
          this.loadExportData();
        }
      });

      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "pipelineUpdate") {
          
            this.pipelineState = msg.obj;
            this.processing = this.pipelineState !== 'end';
          
        }
      });
      
      this.loadSettings();
    },

    handleTheme(event) {
      this.settings.theme = event.target.value;
      this.saveSettings();
    },


    async loadSettings() {
      const data = await new Promise(resolve => chrome.storage.local.get('settings', resolve));
      const settings = data.settings || {};
      
      this.settings = {
        theme: "auto",
        exportType: 'pdf',
        ...settings
      };

      
     
      this.themeUI = this.settings.theme;
      this.applyTheme();
      this.exportTypeUI = this.settings.exportType;
      this.exportMode = this.settings.exportType;
    },

    async saveSettings() {
      const cleanSettings = JSON.parse(JSON.stringify(this.settings));
      await new Promise(resolve => chrome.storage.local.set({ settings: cleanSettings }, resolve));
      this.applyTheme();
    },

    applyTheme() {
      const theme = this.settings.theme;
      const isDark =
        theme === "dark" ||
        (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

      document.documentElement.classList.toggle("dark", isDark);
    },

        handleExportType(event){
      this.settings.exportType = event.target.value;
      this.saveSettings();
    },


  async submitExport() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.runtime.sendMessage({ action: 'initialise' }, () => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'initialise', settings: {exportType: this.exportMode} }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Erreur : Le content script n'est pas injecté ou ne répond pas.", chrome.runtime.lastError.message);
          }
        });

      });
    });
  },

    setTab(tab) {
      this.activeTab = tab;
      if (tab === 'history') {
        this.loadHistory();
      }
    },

    async loadExportData(){
      chrome.runtime.sendMessage({
        action: "getPipelineState",
        tabId : this.tabId
      }, (response) => {
        this.pipelineState = response;
        if(this.pipelineState && this.pipelineState !== 'end'){
          this.processing = true;
        }
      });
    }
  }));
});
