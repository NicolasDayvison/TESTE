export default {
    init: () => { console.log("🏛️ Módulo Fiscal Pronto"); },

    openModal: async () => {
        if(!App.state.storeId) return App.utils.toast("Erro: Loja não carregada.", "error");

        const { data: store } = await _sb.from('stores').select('*').eq('id', App.state.storeId).single();
        
        const old = document.getElementById('fiscal-modal'); if(old) old.remove();

        const html = `
        <div id="fiscal-modal" class="modal-overlay" style="display:flex; z-index:9999;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Configuração Fiscal</h3>
                    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('fiscal-modal').remove()">X</button>
                </div>
                <div class="modal-body">
                    <div class="input-wrapper">
                        <label>Client ID</label>
                        <input type="text" id="nuvem-id" class="input-field" value="${store.nuvem_client_id || ''}">
                    </div>
                    <div class="input-wrapper">
                        <label>Client Secret</label>
                        <input type="password" id="nuvem-secret" class="input-field" value="${store.nuvem_client_secret || ''}">
                    </div>
                    <button class="btn btn-success btn-full" onclick="window.Fiscal.saveCredentials()">Salvar</button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', html);
    },

    saveCredentials: async () => {
        const clientId = document.getElementById('nuvem-id').value;
        const clientSecret = document.getElementById('nuvem-secret').value;

        await _sb.from('stores').update({
            nuvem_client_id: clientId,
            nuvem_client_secret: clientSecret
        }).eq('id', App.state.storeId);

        App.utils.toast("Configuração Salva!", "success");
        document.getElementById('fiscal-modal').remove();
    },
    
    emitirNFCe: (orderId, valor) => {
        App.utils.toast(`Emitindo NFC-e de R$ ${valor}... (Simulação)`, "info");
    }
};