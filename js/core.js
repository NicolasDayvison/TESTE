// js/core.js

// 1. Configurações Globais
window.CONFIG = {
    sbUrl: 'https://groezaseypdbpgymgpvo.supabase.co',
    sbKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdyb2V6YXNleXBkYnBneW1ncHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNjkxNjYsImV4cCI6MjA4MTY0NTE2Nn0.5U5QeoGmZn_i9Y8POoUCkatBUAdSW-cjHRyfxpm_pyM',
    adminPublicKey: 'APP_USR-834374cc-7e6d-494f-9842-49a7e3e57357',
    categories: ['Roupas', 'Comidas', 'Bebidas'],
    subCategoriesRoupas: ['Masculina', 'Feminina', 'Moda Fitness', 'Moda Praia', 'Infantil', 'Acessórios']
};

// 2. Inicia Supabase Globalmente (Agora com window._sb)
if (typeof supabase !== 'undefined') {
    window._sb = supabase.createClient(window.CONFIG.sbUrl, window.CONFIG.sbKey);
    console.log("✅ Banco de Dados Conectado (_sb)");
} else {
    console.error("❌ ERRO: Biblioteca Supabase não carregou no index.html");
}

// 3. Objeto Principal do App
window.App = {
    state: { 
        user: null, 
        profile: null, 
        storeId: null, 
        currentStore: null, 
        cart: [], 
        currentComandaItems: [],
        paymentSplits: [],
        comandaTotal: 0,
        activeChatStore: null,
        activeChatClient: null
    },
    
    utils: {
        toast: (msg, type='success') => { 
            const c = document.getElementById('toast-container'); 
            if(!c) return alert(msg);
            
            const e = document.createElement('div'); 
            e.className=`toast ${type}`; 
            e.innerHTML=`<span>${msg}</span>`; 
            c.appendChild(e); 
            
            // Remove automaticamente
            setTimeout(() => {
                e.style.opacity = '0';
                setTimeout(() => e.remove(), 300);
            }, 3000);
        },
        
        setupPWA: () => { 
            const manifest = { 
                "name": "NexLog", 
                "short_name": "NexLog", 
                "start_url": window.location.href, 
                "display": "standalone", 
                "background_color": "#0f172a", 
                "theme_color": "#06b6d4", 
                "icons": [{ "src": "./logo.png", "sizes": "192x192", "type": "image/png" }] 
            }; 
            const blob = new Blob([JSON.stringify(manifest)], {type: 'application/json'}); 
            const link = document.querySelector('#dynamic-manifest');
            if(link) link.setAttribute('href', URL.createObjectURL(blob)); 
        },

        setupCategories: () => {
            const catList = document.getElementById('category-list');
            const catSelect = document.getElementById('new-prod-cat');
            
            // Preenche lista da Home
            if(catList && window.CONFIG.categories) {
                // Limpa (mantendo o botão 'Todos' se quiser, ou refazendo tudo)
                catList.innerHTML = `<button class="cat-pill active" onclick="App.catalog.filter('Todos', this)">Todos</button>`;
                window.CONFIG.categories.forEach(c => {
                    catList.innerHTML += `<button class="cat-pill" onclick="App.catalog.filter('${c}', this)">${c}</button>`;
                });
            }

            // Preenche Select de Novo Produto
            if(catSelect && window.CONFIG.categories) {
                catSelect.innerHTML = window.CONFIG.categories.map(c => `<option value="${c}">${c}</option>`).join('');
            }
        }
    }
};