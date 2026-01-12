// js/modules/waiter.js
export default {
    init: async () => {
        if (!App.state.user) return;
        
        // Verifica se o usuário é funcionário de alguma loja
        const { data: staffData } = await _sb.from('store_staff')
            .select('store_id')
            .eq('profile_id', App.state.user.id)
            .maybeSingle();
            
        if (!staffData) {
            App.utils.toast("Você não está vinculado a nenhuma loja.", "error");
            return;
        }
        
        App.state.storeId = staffData.store_id;
        App.waiter.loadTables();
        
        // Ouve atualizações nas mesas em tempo real
        _sb.channel('waiter-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas', filter: `store_id=eq.${App.state.storeId}` }, () => { 
                App.waiter.loadTables(); 
            })
            .subscribe();
    },

    loadTables: async () => {
        const { data } = await _sb.from('comandas')
            .select('*')
            .eq('store_id', App.state.storeId)
            .order('numero', { ascending: true });
            
        const container = document.getElementById('comanda-list-container');
        if (data) {
            container.innerHTML = data.map(c => `
                <div class="comanda-card bg-${c.status}" onclick="App.waiter.openComanda('${c.id}', '${c.numero}')">
                    <div class="comanda-corner"></div>
                    <div class="comanda-dot"></div>
                    <div style="font-size:1.5rem;">${c.numero}</div>
                    <div class="text-xs" style="text-transform:uppercase;">${c.status}</div>
                </div>`
            ).join('');
        }
    },

    openComanda: async (id, numero) => {
        App.state.currentComanda = id;
        document.getElementById('comanda-title').innerText = `Mesa ${numero}`;
        document.getElementById('waiter-prod-search').value = "";
        document.getElementById('waiter-search-results').style.display = 'none';
        document.getElementById('comanda-modal').style.display = 'flex';
        App.waiter.loadItems(id);
    },

    loadItems: async (comandaId) => {
        const { data } = await _sb.from('comandas').select('items').eq('id', comandaId).single();
        if (data) App.state.currentComandaItems = data.items || [];
        
        const list = document.getElementById('comanda-items-list');
        if (data && data.items && data.items.length > 0) {
            list.innerHTML = data.items.map(item => `
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:8px;">
                    <div>
                        <span style="font-weight:bold;">${item.qtd}x ${item.nome}</span>
                        <div class="text-xs text-muted">Garçom: ${item.garcom || 'Geral'}</div>
                    </div>
                    <span>R$ ${(item.price * item.qtd).toFixed(2)}</span>
                </div>`
            ).join('');
        } else { 
            list.innerHTML = '<p class="text-sm text-muted text-center" style="padding:10px">Nenhum item lançado.</p>'; 
        }
    },

    addItem: async () => {
        const term = document.getElementById('waiter-prod-search').value;
        if (!term) return alert("Digite o nome do produto");
        
        App.utils.toast("Buscando...", "info");
        
        const { data } = await _sb.from('products')
            .select('*')
            .eq('store_id', App.state.storeId)
            .or(`nome.ilike.%${term}%,codigo_cardapio.eq.${term}`)
            .limit(5);
            
        const resultBox = document.getElementById('waiter-search-results');
        
        if (data && data.length > 0) {
            resultBox.style.display = 'block';
            resultBox.innerHTML = data.map(p => `
                <div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; background:#fff;" 
                     onclick="App.waiter.confirmAdd('${p.id}', '${p.nome}', ${p.preco})">
                    <strong>${p.nome}</strong> - R$ ${p.preco.toFixed(2)}
                </div>`
            ).join('');
        } else { 
            App.utils.toast("Produto não encontrado", "warning"); 
            resultBox.style.display = 'none'; 
        }
    },

    confirmAdd: async (id, nome, price) => {
        const { data: current } = await _sb.from('comandas').select('items').eq('id', App.state.currentComanda).single();
        let currentItems = current.items || [];
        
        const garcomName = App.state.profile ? App.state.profile.nome_completo.split(' ')[0] : 'Sistema';
        const existing = currentItems.find(i => i.id === id);
        
        if (existing) { 
            existing.qtd += 1; 
            existing.garcom = garcomName; 
        } else { 
            currentItems.push({ id: id, nome: nome, price: price, qtd: 1, garcom: garcomName, printed_qtd: 0 }); 
        }
        
        await _sb.from('comandas').update({ items: currentItems, status: 'aberta' }).eq('id', App.state.currentComanda);
        
        document.getElementById('waiter-search-results').style.display = 'none'; 
        document.getElementById('waiter-prod-search').value = '';
        
        App.utils.toast(`Item adicionado!`, 'success'); 
        App.waiter.loadItems(App.state.currentComanda); 
        App.waiter.loadTables();
    },

    printBill: () => {
        const items = App.state.currentComandaItems || [];
        const mesa = document.getElementById('comanda-title').innerText;
        
        const itemsHtml = items.map(item => `
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #000; padding:4px 0;">
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:bold;">${item.qtd}x ${item.nome}</span>
                    <span style="font-size:0.75rem; font-style:italic; color:#444;">(Garçom: ${item.garcom || 'Geral'})</span>
                </div>
                <span style="font-weight:bold;">R$ ${(item.price * item.qtd).toFixed(2)}</span>
            </div>`
        ).join('');
        
        const total = items.reduce((acc, i) => acc + (i.price * i.qtd), 0);
        
        const content = `
            <div style="font-family: monospace; width: 300px; padding: 0 5px;">
                <br>
                <h3 style="text-align:center; margin:0;">CONFERÊNCIA</h3>
                <h2 style="text-align:center; margin:5px 0;">${mesa}</h2>
                <p style="text-align:center; font-size:0.8rem; margin-bottom:10px;">${new Date().toLocaleString()}</p>
                <hr style="border-top: 1px dashed black;">
                ${itemsHtml}
                <hr style="border-top: 1px dashed black;">
                <h3 style="text-align:right; margin-top:10px;">TOTAL: R$ ${total.toFixed(2)}</h3>
                <p style="text-align:center; font-size:0.8rem; margin-top:20px;">* Não vale como documento fiscal *</p>
                <br><br>
            </div>`;
            
        const area = document.getElementById('printable-area'); 
        area.innerHTML = content; 
        window.print();
    },

    sendToKitchen: async () => {
        await _sb.from('comandas').update({ imprimir_cozinha: true, updated_at: new Date() }).eq('id', App.state.currentComanda);
        App.utils.toast("Enviado para a Cozinha!", "success"); 
        document.getElementById('comanda-modal').style.display = 'none';
    }
};