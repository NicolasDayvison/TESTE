// js/modules/catalog.js
export default {
    currentCat: 'Todos',
    
    filter: (cat, btn) => {
        document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        App.catalog.currentCat = cat;
        App.catalog.load();
    },

    selectSize: (element) => {
        const parent = element.parentElement;
        const boxes = parent.getElementsByClassName('size-box');
        for (let box of boxes) { box.classList.remove('selected'); }
        element.classList.add('selected');
    },

    addToCartClothing: async (pid, sid, containerIdSize, containerIdColor) => {
        const containerSize = document.getElementById(containerIdSize);
        const selectedSize = containerSize ? containerSize.querySelector('.selected') : null;
        const containerColor = document.getElementById(containerIdColor);
        const selectedColor = containerColor ? containerColor.querySelector('.selected') : null;

        if (!selectedSize) return App.utils.toast("Selecione um TAMANHO.", "warning");
        
        let corEscolhida = "";
        if (containerColor && containerColor.innerHTML.trim() !== "") {
             if (!selectedColor) return App.utils.toast("Selecione uma COR.", "warning");
             corEscolhida = selectedColor.innerText;
        }

        const tamanho = selectedSize.innerText;
        const { data: p } = await _sb.from('products').select('*').eq('id', pid).single();
        
        const nomeFinal = `${p.nome} (${tamanho}${corEscolhida ? ' / ' + corEscolhida : ''})`;
        const prodToAdd = { ...p, nome: nomeFinal };
        
        App.cart.add(prodToAdd, sid);
    },

    load: async () => {
        let query = _sb.from('products').select('*, stores(nome_loja)');
        
        if (App.catalog.currentCat !== 'Todos') {
            if (CONFIG.categories.includes(App.catalog.currentCat)) {
                query = query.eq('categoria', App.catalog.currentCat);
            } else {
                query = query.eq('categoria', 'Roupas').eq('subcategoria', App.catalog.currentCat);
            }
        }
        
        const { data } = await query;
        const promos = data?.filter(p => p.promocao);
        const normal = data?.filter(p => !p.promocao);
        
        let html = '';

        // Subcategorias de Roupas
        if (App.catalog.currentCat === 'Roupas' || App.catalog.currentCat === 'Todos') {
            const subCatsHtml = CONFIG.subCategoriesRoupas.map(sub => 
                `<button class="cat-pill" style="font-size:0.75rem; padding:4px 10px; margin-right:5px; background:var(--bg-card); border:1px solid var(--border);" onclick="App.catalog.filter('${sub}', this)">${sub}</button>`
            ).join('');
            html += `<div style="grid-column:1/-1; margin-bottom:10px; overflow-x:auto; white-space:nowrap; padding-bottom:5px;">${subCatsHtml}</div>`;
        }

        if (promos && promos.length > 0) {
            html += `<div style="grid-column:1/-1; margin-bottom:10px;"><h3 style="color:var(--danger)">🔥 Ofertas</h3></div>`;
            html += promos.map(p => App.catalog.renderCard(p)).join('');
            if (normal && normal.length > 0) html += `<div style="grid-column:1/-1; margin:20px 0 10px 0;"><h3 style="color:var(--primary)">Produtos</h3></div>`;
        }
        
        html += normal?.map(p => App.catalog.renderCard(p)).join('');
        
        document.getElementById('public-catalog').innerHTML = html || '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#aaa;">Nenhuma oferta encontrada nesta categoria.</div>';
    },

    renderCard: (p) => {
        let actionText = "Comprar";
        const pEncoded = encodeURIComponent(JSON.stringify(p));
        let selectorHtml = '';
        const containerIdSize = `size-container-${p.id}`;
        const containerIdColor = `color-container-${p.id}`;
        let finalOnclick = `App.cart.add(JSON.parse(decodeURIComponent('${pEncoded}')), '${p.store_id}')`;

        // 1. Lógica de Imagem (Aqui está o segredo)
        let imagesHtml = '';
        if (p.imagem_url) {
            imagesHtml = `<img src="${p.imagem_url}" class="gallery-img" onclick="App.ui.openZoom(this.src)" onerror="this.src='https://placehold.co/400x300?text=Sem+Foto'">`;
        } else if (p.galeria && p.galeria.length > 0) {
            imagesHtml = `<img src="${p.galeria[0]}" class="gallery-img" onclick="App.ui.openZoom(this.src)" onerror="this.src='https://placehold.co/400x300?text=Sem+Foto'">`;
        } else {
            // Placeholder cinza se não tiver URL
            imagesHtml = `<div style="width:100%; height:200px; display:flex; align-items:center; justify-content:center; background:#1e293b; color:#64748b; font-weight:bold;">Sem Foto</div>`;
        }

        // 2. Lógica de Roupas
        if (p.categoria === 'Roupas') {
            actionText = "Adicionar";
            let chipsSize = '';
            if (p.sizes) {
                chipsSize = p.sizes.split(',').map(s => `<div class="size-box" onclick="App.catalog.selectSize(this)">${s}</div>`).join('');
            } else { chipsSize = `<div class="size-box selected" onclick="App.catalog.selectSize(this)">Único</div>`; }
            
            let chipsColor = '';
            if (p.cores) {
                chipsColor = p.cores.split(',').map(c => `<div class="size-box" style="font-weight:normal;" onclick="App.catalog.selectSize(this)">${c}</div>`).join('');
            }
            
            selectorHtml = `
            <div style="margin-top:10px; background:rgba(255,255,255,0.03); padding:10px; border-radius:8px;">
                <div style="margin-bottom:8px;">
                    <label class="text-xs" style="font-weight:bold; color:var(--text-muted);">Tamanho:</label>
                    <div id="${containerIdSize}" class="size-selector-container">${chipsSize}</div>
                </div>
                ${chipsColor ? `<div><label class="text-xs" style="font-weight:bold; color:var(--text-muted);">Cor:</label><div id="${containerIdColor}" class="size-selector-container">${chipsColor}</div></div>` : ''}
            </div>`;
            
            finalOnclick = `App.catalog.addToCartClothing('${p.id}', '${p.store_id}', '${containerIdSize}', '${containerIdColor}')`;
        }

        return `
        <div class="card">
            ${p.promocao ? '<div class="badge badge-promo">OFERTA</div>' : ''}
            
            <div class="product-gallery-wrapper">
                ${imagesHtml}
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                <div class="badge status-aceito" style="font-size:0.7rem;">${p.stores?.nome_loja || 'Loja'}</div>
                <button class="btn-doubt-card" onclick="App.chat.open('${p.store_id}')"><i class="ri-chat-3-line"></i></button>
            </div>

            <h4 style="margin-bottom:5px;">${p.nome}</h4>
            <h2 style="color:var(--primary); margin-bottom:5px;">R$ ${p.preco.toFixed(2)}</h2>
            
            ${p.descricao ? `<p class="text-sm text-muted" style="margin-bottom:10px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${p.descricao}</p>` : ''}
            
            ${selectorHtml}
            
            <button class="btn btn-success btn-full" style="margin-top:auto;" onclick="${finalOnclick}">
                ${actionText}
            </button>
        </div>`;
    },

    fetchPublic: async () => { App.catalog.load(); }
};