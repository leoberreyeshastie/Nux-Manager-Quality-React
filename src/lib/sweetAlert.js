import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// Exportar instancia con soporte para React
export const ReactSwal = withReactContent(Swal);

// Configuración global de estilo (opcional)
export const toast = (icon, title, timer = 3000) => {
  ReactSwal.fire({
    icon,
    title,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.style.marginTop = '20px';
    }
  });
};

export const confirm = (title, text, confirmText = 'Sí, continuar', cancelText = 'Cancelar') => {
  return ReactSwal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  });
};

export const errorAlert = (title, text) => {
  return ReactSwal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'Aceptar',
  });
};

export const successAlert = (title, text) => {
  return ReactSwal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: '#3085d6',
    confirmButtonText: 'Aceptar',
  });
};