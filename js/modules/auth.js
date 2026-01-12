export default {
    switchView: (view) => {
        ['login', 'roles', 'register', 'recover'].forEach(v => document.getElementById(`auth-state-${v}`).style.display = 'none');
        document.getElementById(`auth-state-${view}`).style.display = 'block';
    },
    startReg: (role) => {
        App.state.tempRole = role;
        document.getElementById('reg-title').innerText = `Cadastro - ${role === 'loja_admin' ? 'Lojista' : role.toUpperCase()}`;
        App.auth.switchView('register');
        const container = document.getElementById('reg-dynamic-fields');
        let html = '';
        if (role === 'loja_admin') {
            html = `<div class="input-wrapper"><label>Nome da Loja</label><input id="reg-store-name" class="input-field"></div>
                    <div class="input-wrapper"><label>CNPJ</label><input id="reg-cnpj" class="input-field"></div>`;
        } else if (role === 'motorista') {
            html = `<div class="input-wrapper"><label>CPF</label><input id="reg-cpf" class="input-field"></div>`;
        } else {
            html = `<div class="input-wrapper"><label>WhatsApp</label><input id="reg-whatsapp-client" class="input-field"></div>`;
        }
        container.innerHTML = html;
    },
    login: async () => {
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-pass').value;
        const { data, error } = await _sb.from('profiles').select('*').eq('email', email).eq('password', pass).maybeSingle();
        if (error || !data) { App.utils.toast('Dados incorretos', 'error'); } 
        else { 
            App.state.user = { id: data.id }; 
            App.state.profile = data; 
            localStorage.setItem('logimoveis_session', JSON.stringify(data)); 
            App.utils.toast('Bem-vindo!', 'success'); 
            App.router.renderNav(); 
            App.router.goDashboard(); 
        }
    },
    register: async () => {
        const email = document.getElementById('reg-email').value.trim();
        const pass = document.getElementById('reg-pass').value;
        const name = document.getElementById('reg-name').value.trim();
        if (!email || !pass) return App.utils.toast('Preencha tudo', 'error');
        
        const { data: newUser, error } = await _sb.from('profiles').insert({
            nome_completo: name, email: email, password: pass, role: App.state.tempRole
        }).select().single();

        if (error) App.utils.toast('Erro: ' + error.message, 'error');
        else {
            if(App.state.tempRole === 'loja_admin') {
                await _sb.from('stores').insert({ admin_id: newUser.id, nome_loja: document.getElementById('reg-store-name').value });
            }
            App.utils.toast('Sucesso! Faça login.', 'success');
            App.auth.switchView('login');
        }
    },
    logout: () => { localStorage.removeItem('logimoveis_session'); location.reload(); },
    recoverPassword: async () => { App.utils.toast('Função em manutenção.', 'info'); }
};