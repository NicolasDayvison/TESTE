// js/modules/payment.js
export default {
    // --- FUNÇÕES DE LOJA (DIVISÃO DE CONTA) ---
    openSplitModal: (comandaId, items, numeroMesa) => {
        App.state.currentComanda = comandaId;
        App.state.paymentSplits = [];
        App.state.currentComandaItems = items;
        App.state.currentMesaNum = numeroMesa;
        
        let total = 0;
        if (items && Array.isArray(items)) total = items.reduce((acc, item) => acc + (item.price * item.qtd), 0);
        App.state.comandaTotal = total;
        
        document.getElementById('split-total-due').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('split-remaining').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('split-amount').value = total.toFixed(2);
        document.getElementById('split-history').innerHTML = '';
        
        const modalBody = document.querySelector('#split-pay-modal .modal-body');
        // Botão de imprimir conferência
        const oldBtn = document.getElementById('btn-print-split-detail'); if (oldBtn) oldBtn.remove();
        const printBtn = document.createElement('button'); 
        printBtn.id = 'btn-print-split-detail'; 
        printBtn.className = 'btn btn-info btn-sm btn-full'; 
        printBtn.style.marginBottom = '10px'; 
        printBtn.innerHTML = '<i class="ri-printer-line"></i> Imprimir Conferência'; 
        printBtn.onclick = () => App.payment.printCheck();
        
        const historyDiv = document.getElementById('split-history'); 
        if (historyDiv) { modalBody.insertBefore(printBtn, historyDiv.previousElementSibling || historyDiv); } 
        else { modalBody.appendChild(printBtn); }
        
        document.getElementById('split-pay-modal').style.display = 'flex';
    },

    printCheck: () => {
        const items = App.state.currentComandaItems || [];
        const num = App.state.currentMesaNum || '?';
        const total = App.state.comandaTotal || 0;
        let itemsHtml = items.map(i => `<div style="display:flex; justify-content:space-between;"><span>${i.qtd}x ${i.nome}</span><span>R$ ${(i.price * i.qtd).toFixed(2)}</span></div>`).join('');
        const content = `<div style="font-family: monospace; width: 300px; padding: 10px;"><h3 style="text-align:center;">CONFERÊNCIA</h3><p style="text-align:center; font-size:1.2rem;">MESA ${num}</p><p>${new Date().toLocaleString()}</p><hr>${itemsHtml}<hr><h3 style="text-align:right;">TOTAL: R$ ${total.toFixed(2)}</h3></div>`;
        const area = document.getElementById('printable-area'); area.innerHTML = content; window.print();
    },

    toggleCardFields: () => {
        const method = document.getElementById('split-method').value;
        const fields = document.getElementById('card-fields');
        if(fields) fields.style.display = (method === 'cartao') ? 'flex' : 'none';
    },

    addSplit: () => {
        const amount = parseFloat(document.getElementById('split-amount').value);
        const method = document.getElementById('split-method').value;
        const nsu = document.getElementById('card-nsu') ? document.getElementById('card-nsu').value : '';
        
        if (!amount || amount <= 0) return alert("Valor inválido");
        
        App.state.paymentSplits.push({ amount, method, nsu });
        const hist = document.getElementById('split-history');
        hist.innerHTML = App.state.paymentSplits.map(s => `<div>- R$ ${s.amount.toFixed(2)} (${s.method.toUpperCase()})</div>`).join('');
        
        const paid = App.state.paymentSplits.reduce((acc, s) => acc + s.amount, 0);
        const remain = App.state.comandaTotal - paid;
        document.getElementById('split-remaining').innerText = `R$ ${remain > 0 ? remain.toFixed(2) : '0.00'}`;
        
        if (remain <= 0.01) {
            document.getElementById('btn-finish-split').disabled = false;
            document.getElementById('split-amount').value = 0;
        } else { document.getElementById('split-amount').value = remain.toFixed(2); }
    },

    finalizeSplit: async () => {
        const comandaId = App.state.currentComanda;
        const total = App.state.comandaTotal;
        App.utils.toast("Fechando mesa...", "info");
        
        await _sb.from('comandas').update({ status: 'fechada', payments_info: App.state.paymentSplits, total_pago: total }).eq('id', comandaId);
        document.getElementById('split-pay-modal').style.display = 'none';
        
        // Cria pedido concluído para registro
        const { data: newOrder } = await _sb.from('orders').insert({ 
            store_id: App.state.storeId, 
            status: 'concluido', 
            origem_venda: 'comanda', 
            endereco_destino: `Mesa ${App.state.currentMesaNum}`, 
            observacao: JSON.stringify({ itens: App.state.currentComandaItems }) 
        }).select().single();
        
        App.utils.toast("Conta Fechada!", "success");
        
        // Emissão Fiscal Opcional
        setTimeout(() => { 
            if (confirm("Deseja emitir a NFC-e desta mesa?")) { 
                if(App.fiscal) App.fiscal.emitirNFCe(newOrder.id, total); 
            } 
        }, 500);
        
        if(App.store) { App.store.loadComandas(); App.store.loadMetrics(); }
    },

    // --- FUNÇÕES DE CLIENTE (CHECKOUT ONLINE) ---
    open: async (total, orderPayload) => {
        if (!App.state.user) { App.utils.toast("Faça login!", "warning"); App.router.go('auth'); return; }
        
        App.state.pendingPayment = { total, orderPayload };
        document.getElementById('pay-total-display').innerText = `R$ ${total.toFixed(2)}`;
        document.getElementById('payment-modal').style.display = 'flex';
        
        document.getElementById('payment-brick_container').innerHTML = '';
        const oldPix = document.getElementById('pix-display-area'); if (oldPix) oldPix.remove();
        document.getElementById('payment-brick_container').style.display = 'block';
        
        if (total <= 0) { alert("Valor zero."); App.payment.finalizeSuccess(); return; }
        App.payment.renderBrick(total);
    },

    close: () => {
        document.getElementById('payment-modal').style.display = 'none';
        if (App.state.brickController) App.state.brickController.unmount();
        if (App.state.pixInterval) clearInterval(App.state.pixInterval);
    },

    renderBrick: async (amount) => {
        if (typeof mpInstance === 'undefined') { try { mpInstance = new MercadoPago(CONFIG.adminPublicKey); } catch(e) { console.error(e); } }
        
        const builder = mpInstance.bricks();
        const userEmail = App.state.profile?.email || 'guest@nexlog.com';
        
        App.state.brickController = await builder.create("payment", "payment-brick_container", {
            initialization: { amount: amount, payer: { email: userEmail } },
            customization: { 
                paymentMethods: { ticket: "all", bankTransfer: "all", creditCard: "all", debitCard: "all", maxInstallments: 3 }, 
                visual: { style: { theme: 'default' } } 
            },
            callbacks: {
                onReady: () => console.log("Brick Ready"),
                onError: (e) => console.error(e),
                onSubmit: async ({ formData }) => {
                    formData.store_id = App.state.pendingPayment.orderPayload.store_id;
                    return new Promise((resolve, reject) => {
                        fetch("/api/pix", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) })
                            .then(async r => {
                                const data = await r.json();
                                if (!r.ok) { App.utils.toast(data.message || "Erro no pagamento", "error"); reject(); return; }
                                
                                if (data.status === 'approved') { 
                                    App.utils.toast("Pagamento Aprovado!", "success"); 
                                    App.payment.finalizeSuccess(); 
                                    resolve(); 
                                }
                                else if (data.status === 'pending' && data.payment_method_id === 'pix') { 
                                    App.payment.showPixScreen(data); 
                                    resolve(); 
                                }
                                else { 
                                    App.utils.toast("Pagamento Recusado.", "error"); 
                                    reject(); 
                                }
                            }).catch(() => { App.utils.toast("Erro de Conexão", "error"); reject(); });
                    });
                }
            }
        });
    },

    showPixScreen: (data) => {
        document.getElementById('payment-brick_container').style.display = 'none';
        const qr = data.point_of_interaction.transaction_data;
        
        const div = document.createElement('div'); 
        div.id = 'pix-display-area'; 
        div.style.textAlign = 'center';
        div.innerHTML = `
            <div style="background:#f1f5f9; padding:20px; border-radius:12px; margin-bottom:15px; border:2px dashed #cbd5e1;">
                <img src="data:image/png;base64,${qr.qr_code_base64}" style="width:200px">
            </div>
            <p class="text-xs">Copie e Cole:</p> 
            <input value="${qr.qr_code}" readonly style="width:100%; border:1px solid #ddd; padding:5px;">
            <div style="margin-top:20px; color:var(--primary)">
                <i class="ri-loader-4-line spin" style="font-size:2rem"></i>
                <p>Aguardando pagamento...</p>
            </div>`;
            
        document.querySelector('#payment-modal .modal-body').appendChild(div);
        App.payment.startPolling(data.id, App.state.pendingPayment.orderPayload.store_id);
    },

    startPolling: (pid, sid) => {
        if (App.state.pixInterval) clearInterval(App.state.pixInterval);
        App.state.pixInterval = setInterval(async () => { 
            try { 
                // Simulação de verificação se não houver backend
                // const res = await fetch(`/api/pix?id=${pid}&store_id=${sid}`); 
                // const d = await res.json(); 
                // if (d.status === 'approved') { clearInterval(App.state.pixInterval); App.payment.finalizeSuccess(); } 
            } catch (e) { } 
        }, 3000);
    },

    finalizeSuccess: async () => {
        App.payment.close();
        const { orderPayload } = App.state.pendingPayment;
        
        await _sb.from('orders').insert({ 
            cliente_id: App.state.user.id, 
            product_id: orderPayload.product_id, 
            store_id: orderPayload.store_id, 
            endereco_destino: orderPayload.address, 
            requer_montagem: orderPayload.requer_montagem, 
            taxa_servico: orderPayload.taxa, 
            status: 'pendente' 
        });
        
        App.utils.toast('Pedido realizado com sucesso!', 'success'); 
        App.router.go('cliente'); 
        if(App.client) App.client.init();
        
        // Limpa carrinho
        App.state.cart = []; 
        App.cart.activeCoupon = null; 
        App.cart.updateFloater();
    }
};