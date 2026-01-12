// js/modules/chat.js
export default {
    open: async (storeId, clientId = null) => {
        if (!App.state.user) return App.router.go('auth');
        
        App.state.activeChatStore = storeId;
        App.state.activeChatClient = clientId || App.state.user.id;
        
        // 1. Renderizar a Estrutura Nova do Modal
        const isStore = (App.state.profile.role === 'loja_admin');
        
        const modalHtml = `
        <div id="chat-modal" class="modal-overlay" style="display:flex; z-index:10010;">
            <div class="modal-content" style="width:100%; max-width:600px; margin:auto;">
                
                <div class="modal-header">
                    <div class="chat-header-info">
                        <div class="chat-avatar-circle" id="chat-avatar-initials"><i class="ri-user-line"></i></div>
                        <div class="chat-user-name">
                            <h4 id="chat-header-name">Carregando...</h4>
                            <div class="chat-user-status">Online</div>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="App.chat.close()" style="border-radius:50%; width:32px; height:32px; padding:0;"><i class="ri-close-line"></i></button>
                </div>

                <div class="modal-body">
                    <div id="chat-msgs" class="chat-messages"></div>
                </div>

                <div class="chat-footer">
                    <button class="btn-chat-icon btn-mic" onmousedown="App.chat.recordAudio()" onmouseup="App.chat.recordAudio()">
                        <i class="ri-mic-line"></i>
                    </button>
                    <div class="chat-input-wrapper">
                        <input type="text" id="chat-input" class="chat-input-field" placeholder="Digite sua mensagem..." autocomplete="off" onkeypress="if(event.key==='Enter') App.chat.send()">
                    </div>
                    <button class="btn-chat-icon btn-send" onclick="App.chat.send()">
                        <i class="ri-send-plane-fill"></i>
                    </button>
                </div>

            </div>
        </div>`;

        // Remove modal antigo se existir e adiciona o novo
        const old = document.getElementById('chat-modal'); if (old) old.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const msgs = document.getElementById('chat-msgs');
        msgs.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;"><i class="ri-loader-4-line spin"></i></div>';

        // 2. Buscar Nome do Interlocutor
        if (isStore) {
            const { data: profile } = await _sb.from('profiles').select('nome_completo').eq('id', clientId).single();
            if(profile) {
                document.getElementById('chat-header-name').innerText = profile.nome_completo;
                document.getElementById('chat-avatar-initials').innerText = profile.nome_completo.charAt(0);
            }
        } else {
            const { data: store } = await _sb.from('stores').select('nome_loja').eq('id', storeId).single();
            if(store) {
                document.getElementById('chat-header-name').innerText = store.nome_loja;
                document.getElementById('chat-avatar-initials').innerText = store.nome_loja.charAt(0);
            }
        }

        // 3. Carregar Mensagens Antigas
        const { data } = await _sb.from('messages')
            .select('*')
            .eq('store_id', storeId)
            .eq('client_id', App.state.activeChatClient)
            .order('created_at', { ascending: true });
            
        msgs.innerHTML = '';
        if (data && data.length > 0) data.forEach(m => App.chat.renderMsg(m));
        else msgs.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;"><p>Diga Olá! 👋</p></div>';

        // 4. Scroll para o final
        setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 100);

        // 5. Iniciar Realtime (Ouvir novas mensagens)
        if (App.state.chatSub) _sb.removeChannel(App.state.chatSub);
        
        App.state.chatSub = _sb.channel('public:messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `store_id=eq.${storeId}` }, (payload) => {
                if (payload.new.client_id === App.state.activeChatClient) {
                    if (payload.eventType === 'INSERT') {
                        if (msgs.innerText.includes("Diga Olá")) msgs.innerHTML = "";
                        App.chat.renderMsg(payload.new);
                    }
                }
            }).subscribe();
    },

    close: () => {
        document.getElementById('chat-modal').style.display = 'none';
        if (App.state.chatSub) _sb.removeChannel(App.state.chatSub);
    },

    send: async (content = null, type = 'text') => {
        const txtInput = document.getElementById('chat-input');
        const txt = content || txtInput.value;
        if (!txt && type === 'text') return;
        
        await _sb.from('messages').insert({ 
            store_id: App.state.activeChatStore, 
            client_id: App.state.activeChatClient, 
            sender_id: App.state.user.id, 
            content: txt 
        });
        
        if (type === 'text') txtInput.value = '';
    },

    recordAudio: async () => {
        if (!navigator.mediaDevices) return App.utils.toast("Sem suporte a áudio no navegador.", "error");
        
        if (!App.state.mediaRecorder) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                App.state.mediaRecorder = new MediaRecorder(stream);
                App.state.mediaRecorder.ondataavailable = e => App.state.audioChunks.push(e.data);
                
                App.state.mediaRecorder.onstop = async () => {
                    const blob = new Blob(App.state.audioChunks, { type: 'audio/ogg; codecs=opus' });
                    App.state.audioChunks = [];
                    const fileName = `audio_${Date.now()}.ogg`;
                    
                    const { error } = await _sb.storage.from('chat_uploads').upload(fileName, blob);
                    if (!error) {
                        const { data: url } = _sb.storage.from('chat_uploads').getPublicUrl(fileName);
                        App.chat.send(`<audio controls src="${url.publicUrl}"></audio>`, 'audio');
                    } else App.utils.toast("Erro ao enviar áudio", "error");
                };
                
                App.state.mediaRecorder.start();
                App.utils.toast("Gravando... (Solte para enviar)", "info");
            } catch (err) { App.utils.toast("Erro: " + err.message, "error"); }
        } else {
            if (App.state.mediaRecorder.state === 'recording') { 
                App.state.mediaRecorder.stop(); 
                App.utils.toast("Enviando áudio...", "success"); 
            } else { 
                App.state.mediaRecorder.start(); 
                App.utils.toast("Gravando...", "info"); 
            }
        }
    },

    renderMsg: (msg) => {
        const div = document.createElement('div');
        const isMine = msg.sender_id === App.state.user.id;
        
        div.className = `chat-bubble ${isMine ? 'mine' : 'theirs'}`;
        div.id = `msg-${msg.id}`;
        
        if (msg.is_deleted) { 
            div.innerHTML = `<span class="chat-deleted"><i class="ri-prohibited-line"></i> Mensagem apagada</span>`; 
        } else {
            let contentHtml = msg.content;
            if (msg.is_edited) contentHtml += `<span class="chat-edited-label"><i class="ri-pencil-line"></i></span>`;
            
            const time = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            div.innerHTML = `<div>${contentHtml}</div><div class="chat-status">${time} ${isMine ? '<i class="ri-check-double-line"></i>' : ''}</div>`;
            
            // Opção de apagar (apenas mensagens próprias)
            if (isMine) {
               div.onclick = () => { if(confirm("Apagar mensagem?")) App.chat.deleteMsg(msg.id); };
            }
        }
        
        const container = document.getElementById('chat-msgs'); 
        container.appendChild(div); 
        container.scrollTop = container.scrollHeight;
    },

    deleteMsg: async (id) => { 
        await _sb.from('messages').update({ is_deleted: true, content: '🚫 Mensagem apagada' }).eq('id', id); 
    },

    loadHistory: async (viewType) => {
        if (!App.state.user) return;
        const myId = App.state.user.id;
        
        let query = _sb.from('messages')
            .select('*, profiles:sender_id(nome_completo), stores:store_id(nome_loja)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (viewType === 'loja') query = query.eq('store_id', App.state.storeId); 
        else query = query.eq('client_id', myId);
        
        const { data } = await query;
        const containerId = viewType === 'loja' ? 'store-chat-list' : 'client-chat-list';
        const container = document.getElementById(containerId);

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="empty-state-box"><i class="ri-chat-1-line"></i>Nenhuma conversa iniciada.</div>`;
            return;
        }

        let html = '';
        const unique = new Set();
        
        data.forEach(msg => {
            let cid = (viewType === 'loja') ? msg.client_id : msg.store_id;
            if (!unique.has(cid)) {
                unique.add(cid);
                let name = (viewType === 'loja') ? (msg.sender_id !== myId ? msg.profiles?.nome_completo : 'Cliente') : (msg.stores?.nome_loja || 'Loja');
                
                html += `
                <div class="conversa-item" onclick="App.chat.open('${viewType === 'loja' ? App.state.storeId : cid}', '${viewType === 'loja' ? cid : myId}')">
                    <div class="conversa-info">
                        <h4>${name}</h4>
                        <p><i class="ri-reply-line"></i> Toque para responder</p>
                    </div>
                    <div class="conversa-arrow"><i class="ri-arrow-right-s-line"></i></div>
                </div>`;
            }
        });
        
        container.innerHTML = html;
    }
};