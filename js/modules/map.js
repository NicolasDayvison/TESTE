export default {
    open: (orderId, isDriver, address) => {
        App.state.activeOrder = orderId;
        const modal = document.getElementById('map-modal');
        modal.style.display = 'flex';
        
        document.getElementById('map-dest-address').innerText = address;
        
        // Reinicia o mapa para evitar bugs de renderização
        if (App.state.mapInstance) { 
            App.state.mapInstance.remove(); 
            App.state.mapInstance = null; 
        }
        
        // Cria mapa (Coordenadas padrão SP, depois o GPS ajusta)
        App.state.mapInstance = L.map('map').setView([-23.5505, -46.6333], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(App.state.mapInstance);
        
        // Ajusta tamanho
        setTimeout(() => { App.state.mapInstance.invalidateSize(); }, 500);
        
        // Botões
        if (isDriver) { 
            document.getElementById('btn-start-gps').style.display = 'block'; 
            document.getElementById('btn-end-gps').style.display = 'block'; 
        } else { 
            document.getElementById('btn-start-gps').style.display = 'none'; 
            document.getElementById('btn-end-gps').style.display = 'none'; 
        }
    },

    close: () => {
        document.getElementById('map-modal').style.display = 'none';
        if (App.state.mapInstance) { 
            App.state.mapInstance.remove(); 
            App.state.mapInstance = null; 
        }
    },

    startGPS: () => { 
        const dest = document.getElementById('map-dest-address').innerText; 
        // Abre Waze ou Google Maps externo
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`, '_blank'); 
    },

    finishDelivery: async () => {
        if (confirm("Confirmar que a entrega foi realizada?")) {
            const oid = App.state.activeOrder;
            if (!oid) return alert("Erro: Pedido não identificado.");
            
            const { error } = await _sb.from('orders').update({ status: 'concluido' }).eq('id', oid);
            
            if (error) alert("Erro: " + error.message);
            else {
                document.getElementById('map-modal').style.display = 'none';
                App.utils.toast("Entrega Finalizada!", "success");
                if (App.provider && App.provider.init) App.provider.init();
            }
        }
    }
};