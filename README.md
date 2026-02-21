VendexChat Admin

VendexChat Admin es el panel de administración de la plataforma VendexChat. Permite a los comerciantes gestionar productos, pedidos y clientes de su tienda, y ofrece a los superadministradores una consola para supervisar todas las tiendas y suscripciones.

Características principales

Gestión de productos y categorías: crea, edita y organiza productos con un orden personalizado y stock controlado.

Panel de pedidos: consulta los pedidos del día, actualiza su estado y revisa las estadísticas de ventas.

Módulo de clientes: visualiza el historial de compras y notas de tus clientes.

Cupones y promociones: crea y administra cupones de descuento de forma sencilla.

Configuración de tienda (Tenants): edita la información básica de tu comercio y conecta pasarelas de pago.

Consola de superadministración (/sa): panel para usuarios con rol superadmin que permite listar y gestionar todas las tiendas, usuarios y suscripciones de la plataforma.

AI Importer: módulo opcional (solo planes VIP) que importa productos pegando texto, cargando un CSV o escaneando una foto de tu menú mediante OCR y heurísticas de IA.

Tecnologías utilizadas

React 19 + TypeScript

Vite 7 como bundler y servidor de desarrollo

Supabase para base de datos, autenticación y almacenamiento

Tailwind CSS para estilos y utilidades

Lucide Icons para iconos y Tesseract.js para reconocimiento de texto (OCR)

Consulta package.json para ver la lista completa de dependencias y versiones.

Requisitos previos

Node.js v18 o superior

npm o pnpm (el repositorio usa scripts de npm por defecto)

Instalación y ejecución en desarrollo

Clona este repositorio:

git clone https://github.com/Oskelias/VendexChat-admin.git
cd VendexChat-admin


Instala dependencias:

npm install
# o con pnpm
pnpm install


Crea un archivo .env en la raíz y copia las variables de ejemplo de .env.example. Añade también tus claves de Supabase:

# .env
VITE_API_URL=https://api.vendexchat.app
VITE_STOREFRONT_URL=https://vendexchat.app
VITE_SUPABASE_URL=<tu-supabase-url>
VITE_SUPABASE_ANON_KEY=<tu-supabase-anon-key>


Inicia el servidor de desarrollo:

npm run dev


Abre http://localhost:5173
 en tu navegador para ver la aplicación.

Construcción para producción

Para generar la versión optimizada de producción ejecuta:

npm run build


Los archivos resultantes se crearán en la carpeta dist/.

Nota: Actualmente el proceso de lint (npm run lint) arroja varias advertencias y errores. Puedes empezar corrigiendo importaciones no usadas y tipos any para mejorar la calidad del código.

Estructura del proyecto
VendexChat-admin/
├── src/
│   ├── components/        # Componentes reutilizables y layouts
│   ├── contexts/          # Contextos de React (Auth, etc.)
│   ├── pages/             # Páginas de cliente y superadmin
│   │   ├── client/
│   │   ├── superadmin/
│   ├── services/          # API de servicios centralizada
│   ├── supabaseClient.ts  # Configuración de cliente Supabase
│   └── utils/             # Helpers (formatos de fecha, precio, etc.)
├── public/
├── supabase/              # Migraciones SQL y funciones serverless
├── .env.example           # Variables de ejemplo
└── package.json

Contribución

Se agradecen pull requests que mejoren la modularidad, eliminen deuda técnica y añadan pruebas.

Por favor, abre un issue si encuentras algún problema o tienes ideas de mejora.

Licencia

Este repositorio no incluye aún un archivo de licencia. Si deseas utilizar el código en un proyecto propio, consulta con los autores o añade una licencia apropiada.# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
