// js/modules/client.js
export default {
    init: async () => {
        if (!App.state.user) return;
        
        // Carrega pedidos ativos
        const { data: orders } = await _sb.from('orders')
            .select('*, products(nome)')
            .eq('cliente_id', App.state.user.id)
            .neq('status', 'concluido')
            .order('created_at', { ascending: false });

        const container = document.getElementById('client-orders-list');
        if (container) {
            container.innerHTML = orders?.map(o => `
                <div class="card" style="margin-bottom:1rem; border-left: 4px solid var(--info);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem">
                        <strong>${o.products?.nome || 'Produto'}</strong>
                        <span class="badge status-${o.status}">${o.status}</span>
                    </div>
                    <p class="text-sm text-muted">${o.endereco_destino}</p>
                    ${['em_rota', 'aceito', 'concluido'].includes(o.status) ? 
                        `<button class="btn btn-success btn-sm btn-full" onclick="App.map.open('${o.id}', false, '${o.endereco_destino}')">Rastrear Entrega</button>` : ''}
                </div>
            `).join('') || '<div class="empty-orders"><i class="ri-shopping-bag-3-line"></i><p>Nenhum pedido ativo.</p></div>';
        }
        
        // Carrega histórico de chat
        if(App.chat && App.chat.loadHistory) App.chat.loadHistory('client');
    },

    checkTableBill: async () => {
        const num = document.getElementById('client-table-check').value;
        if (!num) return App.utils.toast("Digite o número da mesa", "error");
        
        const { data } = await _sb.from('comandas')
            .select('*, stores(mp_public_key, nome_loja)')
            .eq('numero', num)
            .eq('status', 'aberta')
            .maybeSingle();
        
        if (data && data.items && data.items.length > 0) {
            const total = data.items.reduce((acc, i) => acc + (i.price * i.qtd), 0);
            const listHtml = data.items.map(i => `<div style="display:flex; justify-content:space-between; border-bottom:1px dashed #eee; padding:8px 0; font-size:0.9rem;"><span><strong>${i.qtd}x</strong> ${i.nome}</span><span>R$ ${(i.price * i.qtd).toFixed(2)}</span></div>`).join('');
            const storeKey = data.stores?.mp_public_key || "";
            
            const modalHtml = `
            <div id="client-bill-modal" class="modal-overlay" style="display:flex; z-index:9999;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Conta Mesa ${num}</h3>
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('client-bill-modal').remove()">Fechar</button>
                    </div>
                    <div class="modal-body">
                        <h4 style="text-align:center; color:var(--text-muted);">${data.stores?.nome_loja}</h4>
                        <div style="background:#f9f9f9; padding:15px; border-radius:8px; max-height:250px; overflow-y:auto; border:1px solid #eee; margin:10px 0;">${listHtml}</div>
                        <hr style="margin:15px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span>Total a Pagar:</span>
                            <h2 style="color:var(--primary); margin:0;">R$ ${total.toFixed(2)}</h2>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-success btn-full" onclick="App.client.payBill('${data.id}', ${total}, '${storeKey}', '${data.store_id}')">
                            <i class="ri-secure-payment-line"></i> Pagar Agora
                        </button>
                    </div>
                </div>
            </div>`;
            
            const div = document.createElement('div'); div.innerHTML = modalHtml; document.body.appendChild(div.firstElementChild);
        } else { 
            App.utils.toast("Mesa não encontrada ou fechada.", "error"); 
        }
    },

    payBill: (comandaId, total, pk, storeId) => {
        document.getElementById('client-bill-modal').remove();
        let finalKey = (pk && pk !== 'null') ? pk : CONFIG.adminPublicKey;
        try { 
            mpInstance = new MercadoPago(finalKey); 
            App.payment.open(total, { store_id: storeId, basePrice: total, address: `MESA PAGAMENTO ONLINE`, requer_montagem: false, taxa: 0, is_comanda: true, comanda_id: comandaId }); 
        } catch (e) { 
            App.utils.toast("Erro nas chaves de pagamento.", "error"); 
        }
    }
};