export default {
    createComandas: async () => {
        const start = parseInt(document.getElementById('comanda-start').value);
        const end = parseInt(document.getElementById('comanda-end').value);
        
        if (!start || !end || end < start) {
            return App.ui.alert('Atenção', 'Preencha os números corretamente.', 'error');
        }

        App.utils.toast("Gerando...", "info");
        
        const rows = [];
        for (let i = start; i <= end; i++) {
            rows.push({ 
                store_id: App.state.storeId, 
                numero: i, 
                status: 'livre' 
            });
        }
        
        const { error } = await _sb.from('comandas').insert(rows);
        
        if (error) {
            App.ui.alert('Erro', error.message, 'error');
        } else {
            App.ui.alert('Sucesso', `${rows.length} mesas criadas.`, 'success');
            App.store.loadComandas();
        }
    },
    
    registerStaff: async () => {
        const name = document.getElementById('staff-name').value;
        const email = document.getElementById('staff-email').value;
        
        if(!name || !email) return App.ui.alert('Erro', 'Preencha nome e email.', 'error');
        
        // Nota: Em produção, você criaria o usuário no Supabase Auth aqui.
        App.ui.alert('Sucesso', `Funcionário ${name} cadastrado (Simulação)!`, 'success');
    }
};