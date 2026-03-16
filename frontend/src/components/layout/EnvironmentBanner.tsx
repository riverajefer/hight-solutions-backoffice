import { FC } from 'react';

export const EnvironmentBanner: FC = () => {
  const env = import.meta.env.VITE_ENVIRONMENT?.toLowerCase() || import.meta.env.MODE?.toLowerCase() || 'development';

  if (env === 'production') {
    return null;
  }

  let bgColorClass = 'bg-blue-600';
  let message = '💻 Entorno de Desarrollo Local';
  let textColorClass = 'text-white';
  
  if (['staging', 'stage'].includes(env)) {
    bgColorClass = 'bg-orange-500';
    message = '⚠️ Usted está en un sistema de pruebas';
  } else if (env === 'qa') {
    bgColorClass = 'bg-yellow-400';
    textColorClass = 'text-black';
    message = '⚠️ Entorno QA - Las funciones pueden ser inestables.';
  } else if (env === 'testing') {
    bgColorClass = 'bg-purple-600';
    message = '🧪 Estás usando el entorno de pruebas (TESTING). Los datos aquí pueden ser eliminados o reiniciados.';
  }

  // Se incluyen estilos Tailwind y también estilos inline como resguardo (fallback)
  // para que funcione perfectamente incluso si Material UI es la base principal del proyecto.
  const inlineStyles: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    width: '100%',
    zIndex: 9999,
    padding: '8px 16px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 500,
    color: textColorClass === 'text-black' ? '#000' : '#fff',
    backgroundColor:
      env === 'staging' || env === 'stage' ? '#f97316' :
      env === 'qa' ? '#facc15' :
      env === 'testing' ? '#9333ea' :
      '#2563eb', // development
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
  };

  return (
    <div 
      className={`w-full py-2 px-4 z-[9999] text-center text-sm font-medium sticky top-0 shadow-sm ${bgColorClass} ${textColorClass}`}
      style={inlineStyles}
    >
      {message}
    </div>
  );
};
