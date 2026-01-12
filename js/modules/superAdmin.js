export default {
    init: async () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('mode') === 'god') {
            const btn = document.createElement('button');
            btn.innerHTML = '⚡ GOD MODE';
            btn.style.cssText = "position:fixed; bottom:10px; left:10px; z-index:99999; background:black; color:#0f0; padding:5px;";
            btn.onclick = () => window.SuperAdmin.openPanel();
            document.body.appendChild(btn);
        }
    },
    openPanel: async () => {
        const { data: stores } = await _sb.from('stores').select('*');
        let list = stores.map(s => `<div>${s.nome_loja} (ID: ${s.id})</div>`).join('');
        alert("Lojas:\n" + list);
    }
};