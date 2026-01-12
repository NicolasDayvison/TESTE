// js/main.js
import UI from './modules/ui.js';
import Auth from './modules/auth.js';
import Router from './modules/router.js';
import Store from './modules/store.js';
import Catalog from './modules/catalog.js';
import Cart from './modules/cart.js';
import Client from './modules/client.js';
import Chat from './modules/chat.js';
import Payment from './modules/payment.js';
import Waiter from './modules/waiter.js';
import Provider from './modules/provider.js';
import Map from './modules/map.js';
import Admin from './modules/admin.js';

// Módulos que eram independentes (Caixa, Fiscal, SuperAdmin)
import Caixa from './modules/caixa.js';
import Fiscal from './modules/fiscal.js';
import SuperAdmin from './modules/superAdmin.js';
import Varejo from './modules/varejo.js'; // PDV

// 1. Conecta Módulos ao App Principal
Object.assign(window.App, {
    ui: UI,
    auth: Auth,
    router: Router,
    store: Store,
    catalog: Catalog,
    cart: Cart,
    client: Client,
    chat: Chat,
    payment: Payment,
    waiter: Waiter,
    provider: Provider,
    map: Map,
    admin: Admin,

    // Inicialização Principal
    init: async () => {
        console.log("🚀 Iniciando Sistema Modular...");
        App.utils.setupPWA();
        App.utils.setupCategories();
        
        // Carrega usuário salvo
        const saved = localStorage.getItem('logimoveis_session');
        if (saved) {
            try {
                const user = JSON.parse(saved);
                App.state.user = { id: user.id };
                App.state.profile = user;
                App.router.renderNav(); 
                
                // Se estiver na home, carrega catálogo, senão vai pro painel
                if(window.location.hash === '#home' || !window.location.hash) {
                    if(App.catalog) App.catalog.fetchPublic();
                } else {
                    App.router.goDashboard();
                }
            } catch (e) {
                console.error("Sessão inválida", e);
                localStorage.removeItem('logimoveis_session');
                App.router.renderNav();
                if(App.catalog) App.catalog.fetchPublic();
            }
        } else {
            App.router.renderNav();
            if(App.catalog) App.catalog.fetchPublic();
        }

        // Inicia módulos independentes
        if(window.Caixa) window.Caixa.init();
        if(window.Fiscal) window.Fiscal.init();
        if(window.SuperAdmin) window.SuperAdmin.init();
    }
});

// 2. Expõe Módulos Independentes no Window (para funcionar onclick="Caixa.algo()")
window.Caixa = Caixa;
window.Fiscal = Fiscal;
window.SuperAdmin = SuperAdmin;
window.Varejo = Varejo;

console.log("✅ Main.js carregado com sucesso.");