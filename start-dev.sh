#!/bin/bash

# Script para iniciar Frontend y Backend en paralelo

echo "🚀 Iniciando Hight Solutions Backoffice..."
echo ""

# Colores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar que estamos en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde la raíz del proyecto"
    exit 1
fi

# Iniciar Backend en background
echo -e "${BLUE}📦 Iniciando Backend...${NC}"
npm run start &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend iniciado (PID: $BACKEND_PID)${NC}"
echo ""

# Esperar a que el backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
sleep 3

# Iniciar Frontend
echo -e "${BLUE}⚛️  Iniciando Frontend...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend iniciado (PID: $FRONTEND_PID)${NC}"
echo ""

echo -e "${GREEN}✅ ¡Todo está listo!${NC}"
echo ""
echo "📍 Backend: http://localhost:3000"
echo "📍 Frontend: http://localhost:5173"
echo ""
echo "Usuarios de prueba:"
echo "  admin@example.com / admin123"
echo "  manager@example.com / manager123"
echo "  user@example.com / user123"
echo ""
echo "Presiona Ctrl+C para detener ambos servidores"
echo ""

# Esperar a que se presione Ctrl+C
wait

# Matar ambos procesos cuando se presione Ctrl+C
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
echo ""
echo -e "${GREEN}✓ Servidores detenidos${NC}"
