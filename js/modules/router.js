export default {
    go: (viewId) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(`view-${viewId}`);
        if (target) target.classList.add('active');
        window.scrollTo(0,0);
        App.router.renderNav(viewId);
        if(viewId === 'home') App.catalog.fetchPublic();
    },
    renderNav: (currentView = 'home') => {
        const mobile = document.getElementById('mobile-nav');
        const desktop = document.getElementById('header-nav-area');
        const isActive = (v) => (currentView === v ? 'active' : '');

        if(App.state.user) {
            const name = App.state.profile?.nome_completo.split(' ')[0] || 'User';
            if(desktop) {
                desktop.innerHTML = `
                    <span class="desktop-only-links text-sm text-muted" style="margin-right:10px">Olá, ${name}</span>
                    <button class="btn-header btn-header-outline" onclick="App.router.goDashboard()"><i class="ri-dashboard-line"></i> Painel</button>
                    <button class="btn-header btn-header-primary" onclick="App.auth.logout()"><i class="ri-logout-box-r-line"></i> Sair</button>
                `;
            }
            if(mobile) {
                mobile.innerHTML = `
                    <div class="nav-item ${isActive('home')}" onclick="App.router.go('home')"><i class="ri-store-2-line"></i><span>Loja</span></div>
                    <div class="nav-item ${currentView !== 'home' ? 'active' : ''}" onclick="App.router.goDashboard()"><i class="ri-dashboard-line"></i><span>Painel</span></div>
                    <div class="nav-item" onclick="App.auth.logout()"><i class="ri-logout-box-r-line"></i><span>Sair</span></div>
                `;
            }
        } else {
            if(desktop) desktop.innerHTML = `<button class="btn-header btn-header-primary" onclick="App.router.go('auth')"><i class="ri-user-line"></i> Entrar</button>`;
            if(mobile) {
                mobile.innerHTML = `
                    <div class="nav-item ${isActive('home')}" onclick="App.router.go('home')"><i class="ri-home-5-line"></i><span>Início</span></div>
                    <div class="nav-item ${isActive('auth')}" onclick="App.router.go('auth')"><i class="ri-user-line"></i><span>Entrar</span></div>
                `;
            }
        }
    },
    goDashboard: () => {
        const role = App.state.profile?.role;
        if(role === 'loja_admin') { App.store.init(); App.router.go('loja'); }
        else if(role === 'cliente') { App.client.init(); App.router.go('cliente'); }
        else if(role === 'garcom') { App.waiter.init(); App.router.go('waiter'); }
        else if(role === 'motorista' || role === 'montador') { App.provider.init(); App.router.go('provider'); }
        else App.router.go('home');
    }
};