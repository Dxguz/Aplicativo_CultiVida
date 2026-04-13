export function configurarSweetAlert() {
    if (window.Swal) {
        Swal.mixin({
            position: 'top',
            allowOutsideClick: false,
            didOpen: (modal) => {
                modal.style.zIndex = '10001';
                const container = modal.closest('.swal2-container');
                if (container) {
                    container.style.zIndex = '10001';
                }
            }
        });
    }
}

/**
 * @param {string} title 
 * @param {string} message 
 * @param {string} type - 
 */
export function mostrarAlerta(title, message, type = 'info') {
    if (window.Swal) {
        return Swal.fire({
            title: title,
            text: message,
            icon: type,
            position: 'top',
            zIndex: 10001,
            didOpen: (modal) => {
                modal.style.zIndex = '10001';
            }
        });
    } else {
        console.warn('SweetAlert2 no está disponible');
        alert(`${title}: ${message}`);
    }
}

/**
 
 * @param {string} title
 * @param {string} message 
 * @param {string} confirmText 
 * @param {string} cancelText 
 */
export function mostrarConfirmacion(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    if (window.Swal) {
        return Swal.fire({
            title: title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            position: 'top',
            zIndex: 10001,
            didOpen: (modal) => {
                modal.style.zIndex = '10001';
            }
        });
    }
}

/**
 * @param {HTMLElement} element 
 */
export function garantizarZIndexAlto(element) {
    if (element) {
        element.style.zIndex = '10000';
        
        const backdrop = element.querySelector('[class*="backdrop"], [class*="overlay"]');
        if (backdrop) {
            backdrop.style.zIndex = '9999';
        }
    }
}


export function inicializarNotificaciones() {
    configurarSweetAlert();
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { 
                        if (node.classList && 
                            (node.classList.contains('swal2-container') || 
                             node.classList.contains('modal') || 
                             node.classList.contains('alert') ||
                             node.classList.contains('notification'))) {
                            garantizarZIndexAlto(node);
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarNotificaciones);
} else {
    inicializarNotificaciones();
}
