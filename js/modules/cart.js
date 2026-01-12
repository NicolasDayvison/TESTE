// js/modules/cart.js
export default {
    add: (product, storeId) => {
        App.state.cart.push({ ...product, storeId });
        App.utils.toast("Item adicionado ao carrinho!");
        App.cart.updateFloater();
    },

    updateFloater: () => {
        const total = App.state.cart.reduce((acc, i) => acc + i.preco, 0);
        document.getElementById('cart-count').innerText = App.state.cart.length;
        document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
        
        const floater = document.getElementById('cart-floater');
        if(floater) floater.style.display = App.state.cart.length > 0 ? 'flex' : 'none';
    },

    open: () => {
        document.getElementById('cart-modal').style.display = 'flex';
        const list = document.getElementById('cart-items-list');
        
        if(App.state.cart.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:20px;">Carrinho vazio.</p>';
        } else {
            list.innerHTML = App.state.cart.map((i, idx) => 
                `<div class="cart-item-modern">
                    <div>
                        <div style="font-weight:bold;">${i.nome}</div>
                        <div style="color:var(--primary);">R$ ${i.preco.toFixed(2)}</div>
                    </div>
                    <button class="btn-remove-item" onclick="App.cart.remove(${idx})"><i class="ri-delete-bin-line"></i></button>
                </div>`
            ).join('');
        }
        
        App.cart.calculateTotal();
    },

    remove: (idx) => {
        App.state.cart.splice(idx, 1);
        App.cart.open(); 
        App.cart.updateFloater();
    },

    toggleAddressField: () => {
        const isDelivery = document.getElementById('method-delivery').checked;
        document.getElementById('delivery-address-container').style.display = isDelivery ? 'block' : 'none';
        App.cart.calculateTotal();
    },

    calculateTotal: () => {
        let total = App.state.cart.reduce((acc, i) => acc + i.preco, 0);
        
        // Simulação de taxa de entrega se marcado
        const isDelivery = document.getElementById('method-delivery')?.checked;
        let fee = 0;
        if(isDelivery) fee = 5.00; // Valor fixo simples, pode vir de App.state.currentStore.taxa_entrega_padrao

        if(document.getElementById('label-subtotal')) document.getElementById('label-subtotal').innerText = `R$ ${total.toFixed(2)}`;
        if(document.getElementById('label-delivery-fee')) document.getElementById('label-delivery-fee').innerText = isDelivery ? `+ R$ ${fee.toFixed(2)}` : 'Grátis';
        
        const finalTotal = total + fee;
        if(document.getElementById('cart-total-modal')) document.getElementById('cart-total-modal').innerText = `R$ ${finalTotal.toFixed(2)}`;
        
        return { total, fee, finalTotal };
    },

    checkout: async () => {
        // 1. Verifica Login
        if(!App.state.user) { 
            document.getElementById('cart-modal').style.display = 'none';
            App.utils.toast("Faça login para continuar.", "warning"); 
            App.router.go('auth'); 
            return; 
        }

        // 2. Validações
        if(App.state.cart.length === 0) return;
        
        const isDelivery = document.getElementById('method-delivery').checked;
        const addressInput = document.getElementById('cart-delivery-address');
        
        let finalAddress = "RETIRADA NA LOJA";
        if(isDelivery) {
            if(addressInput.value.length < 5) return alert("Digite o endereço de entrega completo.");
            finalAddress = "ENTREGA: " + addressInput.value;
        }

        // 3. Prepara Pagamento
        const totals = App.cart.calculateTotal();
        const firstItem = App.state.cart[0];
        
        document.getElementById('cart-modal').style.display = 'none';
        
        // Chama o Módulo de Pagamento REAL
        if (App.payment) {
            App.payment.open(totals.finalTotal, {
                product_id: firstItem.id, // Referência
                store_id: firstItem.store_id,
                basePrice: totals.finalTotal,
                address: finalAddress,
                requer_montagem: false,
                taxa: totals.fee
            });
        } else {
            alert("Erro: Módulo de pagamento (payment.js) não carregado.");
        }
    },
    
    applyCoupon: () => alert("Cupons em breve.")
};