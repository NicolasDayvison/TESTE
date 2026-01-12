export default {
    init: async () => {
        const myId = App.state.user.id;
        
        // Busca pedidos disponíveis (aguardando ou em rota comigo)
        const { data: job } = await _sb.from('orders')
            .select('*, products(nome, categoria), profiles:cliente_id(nome_completo, whatsapp)')
            .or(`status.eq.aguardando_prestador,status.eq.em_rota`)
            .order('created_at', { ascending: false });

        const container = document.getElementById('provider-jobs-list');
        let html = '';
        
        if (job && job.length > 0) {
            for (let j of job) {
                // Lógica de exclusividade (se a loja tem parceiro fixo)
                const { data: store } = await _sb.from('stores').select('parceiro_exclusivo_id').eq('id', j.store_id).maybeSingle();
                const isExclusive = (store && store.parceiro_exclusivo_id === myId);
                
                // Se a loja tem parceiro e NÃO sou eu, ignora
                if (store && store.parceiro_exclusivo_id && !isExclusive) continue;

                let actionBtn = '';
                if (j.status === 'aguardando_prestador') { 
                    actionBtn = `<button class="btn btn-success btn-sm btn-full" onclick="App.provider.acceptJob('${j.id}')">Aceitar Corrida/Serviço</button>`; 
                }
                else if (j.status === 'em_rota' && j.prestador_id === myId) { 
                    actionBtn = `<button class="btn btn-info btn-sm btn-full" onclick="App.map.open('${j.id}', true, '${j.endereco_destino}')">Continuar Rota</button>`; 
                }

                // Renderiza Card
                if (actionBtn) {
                    let clientWppHtml = '';
                    if (j.profiles?.whatsapp) { 
                        clientWppHtml = `<a href="https://wa.me/55${j.profiles.whatsapp.replace(/\D/g, '')}" target="_blank" class="btn btn-sm btn-secondary" style="margin-top:5px; text-decoration:none; display:inline-flex;"><i class="ri-whatsapp-line"></i> Falar com Cliente</a>`; 
                    }
                    
                    html += `
                    <div class="card" style="margin-bottom:1rem">
                        <div style="display:flex; justify-content:space-between">
                            <strong>${j.products?.nome || 'Serviço'}</strong>
                            <span class="badge status-${j.status}">${j.status}</span>
                        </div>
                        <p class="text-sm">Destino: ${j.endereco_destino}</p>
                        <div style="font-weight:bold; color:var(--success-dark); margin-bottom:5px;">
                            Ganho: R$ ${(j.taxa_servico || 0).toFixed(2)}
                        </div>
                        ${clientWppHtml}
                        <div style="margin-top:10px;">${actionBtn}</div>
                    </div>`;
                }
            }
        }
        
        if(container) container.innerHTML = html || '<div style="text-align:center; padding:20px; color:#aaa;">Nenhum serviço disponível no momento.</div>';
    },

    updatePix: async () => { 
        const pix = prompt("Informe sua chave Pix para recebimento:"); 
        if (pix) { 
            await _sb.from('profiles').update({ chave_pix: pix }).eq('id', App.state.user.id); 
            App.state.profile.chave_pix = pix; 
            App.utils.toast("Pix atualizado!", "success"); 
        } 
    },

    acceptJob: async (id) => {
        await _sb.from('orders').update({ status: 'em_rota', prestador_id: App.state.user.id }).eq('id', id);
        App.utils.toast("Aceito! Iniciando navegação...", "success");
        
        const { data } = await _sb.from('orders').select('endereco_destino').eq('id', id).single();
        if (App.map) { 
            App.map.open(id, true, data.endereco_destino); 
        } else { 
            App.utils.toast("Módulo de mapa não encontrado.", "error"); 
        }
        App.provider.init();
    }
};