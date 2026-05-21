// Alpine.js (alpine scp friendly) version
document.addEventListener('alpine:init', () => {
  Alpine.data('popupApp', () => ({
    activeTab: 'export',
    exportMode: 'pdf',
    history: [],
    loadingHistory: false,
    tabId : 0,
    pipelineState : 'end_cycle',
    processing : false,
    themeUI: 'auto',
    exportTypeUI : 'pdf',


    settings: {
      theme: "auto",
      exportType: 'pdf'
    },

    // Helper de traduction
    t(key) { 
      return chrome.i18n.getMessage(key) || key; 
    },

    // Labels de pipeline traduits dynamiquement
    get stepLabels() {
      return {
        security_waiting: {
          label: this.t("step_security_label"),
          description: this.t("step_security_desc")
        },
        stabilized_viewer: {
          label: this.t("step_stabilized_label"),
          description: this.t("step_stabilized_desc")
        },
        capture_scrolling: {
          label: this.t("step_capture_label"),
          description: this.t("step_capture_desc")
        },
        html_generated: {
          label: this.t("step_processing_label"),
          description: this.t("step_processing_desc")
        },
        redirected: {
          label: this.t("step_redirect_label"),
          description: this.t("step_redirect_desc")
        },
        process_launched: {
          label: this.t("step_prep_label"),
          description: this.t("step_prep_desc")
        },
        fetch_waiting: {
          label: this.t("step_download_label"),
          description: this.t("step_download_desc")
        },
        download_asked: {
          label: this.t("step_init_label"),
          description: this.t("step_init_desc")
        },
        pdf_print: {
          label: this.t("step_print_label"),
          description: this.t("step_print_desc")
        }
      };
    },

    async init() {
      // Utilisation de chrome.* pour la compatibilité V2/V3 large
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
          if (msg.tabId === this.tabId) {
            this.pipelineState = msg.pipeline;
            this.processing = this.pipelineState !== 'end_cycle';
          }
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

    // 1. On prévient d'abord le background si nécessaire
    chrome.runtime.sendMessage({ action: 'initialise' }, () => {

      // 2. On envoie le message au CONTENT SCRIPT de l'onglet actif
      chrome.tabs.sendMessage(tabs[0].id, { action: 'initialise', settings: {exportType: this.exportMode} }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Erreur : Le content script n'est pas injecté ou ne répond pas.", chrome.runtime.lastError.message);
        }
      });

    });
  });
  console.log('sended');
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
        if(this.pipelineState && this.pipelineState !== 'end_cycle'){
          this.processing = true;
        }
      });
    },

    openBookUrl(url) {
      if (url) chrome.tabs.create({ url });
    },

    async deleteHistoryItem(exportedAt) {
      this.history = this.history.filter(item => item.exportedAt !== exportedAt);
      const safeHistory = this.history.map(item => JSON.parse(JSON.stringify(item)));
      await new Promise(resolve => chrome.storage.local.set({ history: safeHistory }, resolve));
    },

    formatBadgeText(state) {
      return state ? state.toUpperCase() : '';
    },

    formatAuthors(authors) {
      return authors && authors.length ? authors.join(', ') : this.t('unknown_author');
    },

    formatDate(date) {
      // Utilise la locale du navigateur pour le format de date automatique
      return new Date(date).toLocaleDateString(chrome.i18n.getUILanguage());
    }
  }));
});
