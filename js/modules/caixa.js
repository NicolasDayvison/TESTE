export default {
    state: { aberto: false, saldo: 0, fundo: 0, movimentacoes: [] },
    init: () => {
        const saved = localStorage.getItem('nexlog_caixa');
        if (saved) window.Caixa.state = JSON.parse(saved);
        console.log("💰 Caixa Iniciado");
    },
    save: () => { localStorage.setItem('nexlog_caixa', JSON.stringify(window.Caixa.state)); },
    openView: () => {
        if (!window.Caixa.state.aberto) window.Caixa.renderAbertura();
        else window.Caixa.renderPainel();
    },
    renderAbertura: () => {
        const html = `<div id="caixa-modal" class="modal-overlay" style="display:flex; z-index:10005;">
            <div class="modal-content"><div class="modal-body">
            <h3>Abrir Caixa</h3><input type="number" id="caixa-fundo" class="input-field" placeholder="Fundo de Troco">
            <button class="btn btn-success btn-full" onclick="Caixa.confirmarAbertura()">Confirmar</button>
            <button class="btn btn-secondary btn-full" onclick="document.getElementById('caixa-modal').remove()">Cancelar</button>
            </div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },
    confirmarAbertura: () => {
        const val = parseFloat(document.getElementById('caixa-fundo').value) || 0;
        window.Caixa.state = { aberto: true, fundo: val, saldo: val, movimentacoes: [] };
        window.Caixa.save();
        document.getElementById('caixa-modal').remove();
        window.Caixa.renderPainel();
    },
    renderPainel: () => {
        const s = window.Caixa.state;
        const html = `<div id="caixa-painel" class="modal-overlay" style="display:flex; z-index:10005;">
            <div class="modal-content"><div class="modal-header"><h3>Caixa</h3><button onclick="document.getElementById('caixa-painel').remove()">X</button></div>
            <div class="modal-body"><h2>R$ ${s.saldo.toFixed(2)}</h2><p>Fundo: R$ ${s.fundo.toFixed(2)}</p>
            <button class="btn btn-danger btn-full" onclick="Caixa.fecharCaixa()">Fechar Caixa</button></div></div></div>`;
        const old = document.getElementById('caixa-painel'); if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', html);
    },
    fecharCaixa: () => {
        if(confirm("Fechar caixa?")) {
            window.Caixa.state.aberto = false; window.Caixa.save();
            document.getElementById('caixa-painel').remove();
            App.ui.alert("Caixa", "Caixa fechado.");
        }
    }
};