export default {
    openZoom: (src) => {
        const modal = document.getElementById('image-zoom-modal');
        const img = document.getElementById('img-zoom-target');
        if(modal && img) { img.src = src; modal.style.display = 'flex'; }
    },
    closeZoom: () => { document.getElementById('image-zoom-modal').style.display = 'none'; },
    alert: (title, msg, type = 'success') => {
        const modal = document.getElementById('custom-alert-modal');
        if(modal) {
            document.getElementById('alert-title').innerText = title;
            document.getElementById('alert-msg').innerText = msg;
            modal.style.display = 'flex';
        } else { alert(`${title}: ${msg}`); }
    }
};