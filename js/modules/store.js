// js/modules/store.js - VERSÃO COM IMAGENS E UPLOAD
export default {
    init: async () => {
        if (!App.state.user) return;
        
        // 1. Identifica ou Cria a Loja
        let { data: store } = await _sb.from('stores').select('*').eq('admin_id', App.state.user.id).maybeSingle();
        if (!store) {
            const { data: newStore } = await _sb.from('stores').insert({ admin_id: App.state.user.id, nome_loja: 'Minha Loja' }).select().single();
            store = newStore;
        }
        
        // 2. Salva Estado
        App.state.storeId = store.id;
        App.state.currentStore = store;

        // 3. Atualiza Interface
        const titleEl = document.querySelector('#view-loja h2');
        if(titleEl) titleEl.innerText = store.nome_loja || 'Painel da Loja';
        
        // Configurações Visuais
        const isRestaurante = store.tipo_loja === 'Restaurante';
        if (document.getElementById('admin-restaurant-panel')) document.getElementById('admin-restaurant-panel').style.display = isRestaurante ? 'block' : 'none';
        
        // Inputs de Configuração
        if (document.getElementById('store-pickup-address')) document.getElementById('store-pickup-address').value = store.endereco_retirada || '';
        if (document.getElementById('store-delivery-fee')) document.getElementById('store-delivery-fee').value = store.taxa_entrega_padrao || '';
        if (document.getElementById('store-access-token')) document.getElementById('store-access-token').value = store.mp_access_token || '';
        if (document.getElementById('store-public-key')) document.getElementById('store-public-key').value = store.mp_public_key || '';

        // 4. Carrega Dados
        App.store.loadMyProducts();
        App.store.loadOrders();
        App.store.loadComandas();
        App.store.loadMetrics();
        App.store.listenMessages();
        
        if (window.Caixa) window.Caixa.init();
    },

    // --- PRODUTOS (AGORA COM FOTO!) ---
    loadMyProducts: async () => {
        const { data } = await _sb.from('products').select('*').eq('store_id', App.state.storeId);
        const container = document.getElementById('store-products-list');
        if (container) {
            container.innerHTML = data?.map(p => {
                const pSafe = JSON.stringify(p).replace(/"/g, '&quot;');
                // Lógica da Imagem (Pega a primeira ou placeholder)
                let imgHtml = '<div style="width:50px; height:50px; background:#eee; border-radius:4px;"></div>';
                if(p.imagem_url) imgHtml = `<img src="${p.imagem_url}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">`;
                
                return `
                <div class="admin-product-card" style="display:flex; align-items:center; gap:10px; padding:10px; border-bottom:1px solid #eee;">
                    ${imgHtml}
                    <div class="admin-prod-info" style="flex:1;">
                        <h4 style="margin:0; font-size:1rem;">${p.nome}</h4>
                        <span style="font-weight:bold; color:var(--primary);">R$ ${p.preco.toFixed(2)}</span>
                    </div>
                    <div class="admin-prod-actions">
                        <button class="btn-icon-action btn-edit" onclick='App.store.openEditProduct(${pSafe})'><i class="ri-pencil-line"></i></button>
                        <button class="btn-icon-action btn-delete" onclick="App.store.deleteProduct('${p.id}')"><i class="ri-delete-bin-line"></i></button>
                    </div>
                </div>`;
            }).join('');
        }
    },

    openProductModal: () => {
        document.getElementById('prod-modal-title').innerText = "Novo Produto";
        ['edit-prod-id', 'new-prod-name', 'new-prod-price', 'new-prod-desc', 'new-prod-file'].forEach(id => { 
            const el = document.getElementById(id); if(el) el.value = ""; 
        });
        document.getElementById('product-modal').style.display = 'flex';
    },

    openEditProduct: (p) => {
        document.getElementById('prod-modal-title').innerText = "Editar Produto";
        document.getElementById('edit-prod-id').value = p.id;
        document.getElementById('new-prod-name').value = p.nome;
        document.getElementById('new-prod-price').value = p.preco;
        document.getElementById('new-prod-desc').value = p.descricao || "";
        document.getElementById('product-modal').style.display = 'flex';
    },

    closeProductModal: () => { document.getElementById('product-modal').style.display = 'none'; },

    // --- SALVAR COM UPLOAD (A PARTE QUE FALTAVA) ---
    submitProduct: async () => {
        const nome = document.getElementById('new-prod-name').value;
        const preco = document.getElementById('new-prod-price').value;
        const id = document.getElementById('edit-prod-id').value;
        const cat = document.getElementById('new-prod-cat').value;
        const desc = document.getElementById('new-prod-desc').value;

        if (!nome || !preco) return App.utils.toast("Preencha nome e preço", "error");

        App.utils.toast("Salvando...", "info");

        // 1. Prepara dados básicos
        const payload = { 
            store_id: App.state.storeId, 
            nome, 
            preco: parseFloat(preco), 
            categoria: cat,
            descricao: desc
        };

        // 2. Lógica de Upload de Imagem
        const fileInput = document.getElementById('new-prod-file');
        let galeriaUrls = [];

        if (fileInput && fileInput.files.length > 0) {
            App.utils.toast("Enviando imagem...", "info");
            
            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];
                // Cria nome único: lojaID_timestamp_indice.extensao
                const fileName = `${App.state.storeId}_${Date.now()}_${i}.${file.name.split('.').pop()}`;
                
                const { data, error } = await _sb.storage.from('produtos').upload(fileName, file);
                
                if (!error) { 
                    const { data: urlData } = _sb.storage.from('produtos').getPublicUrl(fileName); 
                    galeriaUrls.push(urlData.publicUrl); 
                } else {
                    console.error("Erro upload:", error);
                }
            }
        }

        // Se enviou imagens novas, atualiza o payload
        if (galeriaUrls.length > 0) { 
            payload.galeria = galeriaUrls; 
            payload.imagem_url = galeriaUrls[0]; // Capa
        }

        // 3. Salva no Banco
        let error = null;
        if (id) {
            const res = await _sb.from('products').update(payload).eq('id', id);
            error = res.error;
        } else {
            const res = await _sb.from('products').insert(payload);
            error = res.error;
        }

        if(error) {
            App.utils.toast("Erro ao salvar: " + error.message, "error");
        } else {
            App.store.closeProductModal();
            App.store.loadMyProducts(); // Recarrega a lista
            if(App.catalog) App.catalog.fetchPublic(); // Atualiza a Home também
            App.utils.toast("Produto salvo com sucesso!", "success");
        }
    },

    deleteProduct: async (id) => {
        if(confirm("Excluir este produto?")) {
            await _sb.from('products').delete().eq('id', id);
            App.store.loadMyProducts();
            if(App.catalog) App.catalog.fetchPublic();
        }
    },

    // --- COMANDAS, PEDIDOS E OUTROS ---
    loadComandas: async () => { 
        const { data } = await _sb.from('comandas').select('*').eq('store_id', App.state.storeId).order('numero', { ascending: true });
        const container = document.getElementById('admin-comanda-grid');
        
        if(container) {
            if (!data || data.length === 0) {
                container.innerHTML = `<div class="empty-state-box" style="grid-column: 1/-1;"><i class="ri-layout-masonry-line"></i> Nenhuma mesa cadastrada.</div>`;
                return;
            }
            container.innerHTML = data.map(c => {
                const isLivre = c.status === 'livre';
                const statusClass = isLivre ? 'status-livre' : 'status-aberta';
                const label = isLivre ? 'Livre' : 'Ocupada';
                const safeItems = encodeURIComponent(JSON.stringify(c.items || []));
                return `<div class="table-btn ${statusClass}" onclick="App.store.manageComanda('${c.id}', '${safeItems}', '${c.numero}', '${c.status}')"><span>${c.numero}</span><small>${label}</small>${!isLivre ? '<div style="position:absolute; top:5px; right:5px; width:8px; height:8px; background:var(--danger); border-radius:50%;"></div>' : ''}</div>`;
            }).join('');
        }
    },

    manageComanda: (id, itemsEncoded, num, status) => { 
        if (status === 'livre') return App.utils.toast("Comanda livre. O garçom deve abrir lançando pedidos.", "info");
        const items = JSON.parse(decodeURIComponent(itemsEncoded));
        if (App.payment) App.payment.openSplitModal(id, items, num);
    },

    loadOrders: async () => { 
        const { data: orders } = await _sb.from('orders').select('*, products(nome), profiles(nome_completo)').eq('store_id', App.state.storeId).in('status', ['pendente', 'aguardando_prestador', 'pago', 'em_rota']).order('created_at', { ascending: false });
        const container = document.getElementById('store-orders-list');
        if(container) {
            container.innerHTML = orders?.map(o => `<div class="card" style="margin-bottom:10px; padding:15px; border-left:4px solid var(--primary);"><div style="display:flex; justify-content:space-between;"><strong>${o.products?.nome || 'Item'}</strong><span class="badge status-${o.status}">${o.status}</span></div><p class="text-xs text-muted">${o.profiles?.nome_completo || 'Cliente'}</p>${o.status === 'pendente' ? `<button class="btn btn-sm btn-primary" style="width:100%; margin-top:5px;" onclick="App.store.dispatch('${o.id}')">Aceitar / Despachar</button>` : ''}</div>`).join('') || `<div class="empty-state-box">Tudo limpo!</div>`;
        }
    },

    dispatch: async (id) => {
        await _sb.from('orders').update({ status: 'aguardando_prestador' }).eq('id', id);
        App.utils.toast("Pedido Despachado!", "success");
        App.store.loadOrders();
    },

    loadMetrics: async () => { 
        const sid = App.state.storeId;
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: orders } = await _sb.from('orders').select('created_at, taxa_servico').eq('store_id', sid).neq('status', 'cancelado');
        const { data: comandas } = await _sb.from('comandas').select('created_at, total_pago').eq('store_id', sid).eq('status', 'fechada');
        let day = 0, month = 0;
        orders?.forEach(o => { const val = o.taxa_servico || 0; if (o.created_at >= startOfDay) day += val; if (o.created_at >= startOfMonth) month += val; });
        comandas?.forEach(c => { const val = c.total_pago || 0; if (c.created_at >= startOfDay) day += val; if (c.created_at >= startOfMonth) month += val; });
        if (document.getElementById('metric-day')) document.getElementById('metric-day').innerText = `R$ ${day.toFixed(2)}`;
        if (document.getElementById('metric-month')) document.getElementById('metric-month').innerText = `R$ ${month.toFixed(2)}`;
    },

    listenMessages: () => {
        const myStoreId = App.state.storeId;
        _sb.channel('store-notifications').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `store_id=eq.${myStoreId}` }, async (payload) => {
            if (payload.new.sender_id !== App.state.user.id) {
                const { data: sender } = await _sb.from('profiles').select('nome_completo').eq('id', payload.new.sender_id).single();
                if(sender) App.utils.showChatNotification(sender.nome_completo, payload.new.content, payload.new.client_id);
            }
        }).subscribe();
    },

    saveCredentials: async () => {
        const acc = document.getElementById('store-access-token').value;
        const pub = document.getElementById('store-public-key').value;
        await _sb.from('stores').update({ mp_access_token: acc, mp_public_key: pub }).eq('id', App.state.storeId);
        App.utils.toast("Credenciais Salvas!", "success");
    },
    
    saveLogistics: async () => {
        const addr = document.getElementById('store-pickup-address').value;
        const fee = document.getElementById('store-delivery-fee').value;
        await _sb.from('stores').update({ endereco_retirada: addr, taxa_entrega_padrao: fee }).eq('id', App.state.storeId);
        App.utils.toast("Logística Salva!", "success");
    },

    toggleAutoPrint: () => {},
    setupPrinter: () => window.print(),
    importProducts: () => alert("Importação via CSV em breve."),
    filterHistory: () => alert("Histórico completo em breve."),
    linkPartner: () => alert("Função parceiro em breve.")
};