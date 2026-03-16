# VENDExChat - Guia de Marca y Estilos

Guia de referencia para mantener consistencia visual en todo el sistema.
Todos los estilos utilizan **Tailwind CSS v4.1** con la paleta por defecto (sin configuracion personalizada).

---

## 1. Identidad de Marca

| Elemento         | Valor                                       |
| ---------------- | ------------------------------------------- |
| **Nombre**       | VENDExChat                                  |
| **Subtitulo**    | Panel de Administracion                     |
| **Dominio**      | vendexchat.app                              |
| **Idioma**       | Espanol (es)                                |
| **Desarrollador**| @InteliarStack                              |
| **Favicon**      | `/public/vite.svg` (pendiente de reemplazar con logo oficial) |
| **Sub-marcas**   | VENDEx Bot, VENDEx WhatsApp, VENDEx AI, VENDEx Auto-Pilot, VENDEx Pro/Premium |

### Logo Oficial

El logo de VENDExChat es un **robot amigable dentro de una burbuja de chat**, sobre un fondo verde con esquinas redondeadas tipo app icon. Existen **2 variantes** que difieren en el tono del fondo.

**Elementos del logo (comunes a ambas variantes):**

| Elemento                  | Color                      | Descripcion                                |
| ------------------------- | -------------------------- | ------------------------------------------ |
| **Burbuja de chat**       | Violeta/Indigo (~`#3F2B96`)| Burbuja de dialogo con cola en esquina inferior izquierda |
| **Cuerpo del robot**      | Verde claro (~`#4CD89D`)   | Cabeza redondeada, torso, brazos laterales  |
| **Detalles del robot**    | Verde oscuro (sombras)     | Sombras sutiles en cabeza y torso           |
| **Antena**                | Verde menta (~`#5CEDB0`)   | Circulo pequeno sobre la cabeza del robot   |
| **Ojos**                  | Blanco con pupilas negras  | Dos ojos redondos, expresion amigable       |
| **Sonrisa**               | Blanco                     | Sonrisa curva debajo de los ojos            |

**Variantes del logo:**

| Variante             | Fondo                      | Uso recomendado                       |
| -------------------- | -------------------------- | ------------------------------------- |
| **Variante 1 (Bright)** | Verde brillante/neon (~`#00D26A`) | Digital, app stores, fondos oscuros   |
| **Variante 2 (Classic)**| Verde medio/profundo (~`#4CAF50`) | Impresion, fondos claros, formal      |

Ambas variantes tienen formato de **app icon** (cuadrado con esquinas muy redondeadas).

**Colores clave del logo:**

| Nombre          | Variante 1 (Bright) | Variante 2 (Classic) | Rol                      |
| --------------- | -------------------- | -------------------- | ------------------------ |
| Verde fondo     | `#00D26A`            | `#4CAF50`            | Fondo principal del icono|
| Violeta         | `#3F2B96`            | `#3F2B96`            | Burbuja de chat          |
| Verde robot     | `#4CD89D`            | `#4CD89D`            | Cuerpo del robot         |
| Verde menta     | `#5CEDB0`            | `#5CEDB0`            | Antena, acentos claros   |
| Blanco          | `#FFFFFF`            | `#FFFFFF`             | Ojos y sonrisa           |

**Significado:** El logo combina un chatbot (robot amigable) con una burbuja de conversacion, representando la naturaleza del producto: un asistente de ventas conversacional. Los colores verde y violeta refuerzan la paleta de la marca usada en la app (emerald para merchants, indigo/violet para superadmin).

**Nota:** En la app, el sidebar usa el icono `Store` de lucide-react como representacion simplificada del logo, con fondo `emerald-600` (merchant) o `indigo-600` (superadmin).

---

## 2. Paleta de Colores

### 2.1 Colores Primarios por Rol

| Rol            | Color Principal | Fondo Activo | Texto Activo  | Uso                        |
| -------------- | --------------- | ------------ | ------------- | -------------------------- |
| **Merchant**   | `emerald-600`   | `emerald-50` | `emerald-700` | Navegacion, avatar, logo   |
| **Superadmin** | `indigo-600`    | `indigo-50`  | `indigo-700`  | Navegacion, avatar, logo   |

### 2.2 Emerald (Color de marca principal)

| Tono          | Hex       | Uso                                        |
| ------------- | --------- | ------------------------------------------ |
| `emerald-50`  | `#ecfdf5` | Fondos hover/focus, tarjetas, nav activa   |
| `emerald-100` | `#d1fae5` | Badges ("Nuevo"), notificaciones           |
| `emerald-200` | `#a7f3d0` | Bordes decorativos, sombras                |
| `emerald-300` | `#6ee7b7` | Bordes de focus en inputs                  |
| `emerald-400` | `#34d399` | Indicadores animados (pulso), iconos       |
| `emerald-500` | `#10b981` | Focus rings de inputs/selects, acentos     |
| `emerald-600` | `#059669` | Avatar, logo, spinners, botones marca      |
| `emerald-700` | `#047857` | Hover en enlaces, texto de nav activa      |
| `emerald-800` | `#065f46` | Texto oscuro sobre fondos claros           |
| `emerald-900` | `#064e3b` | Texto muy oscuro (uso minimo)              |

### 2.3 Green (Acciones y botones CTA)

| Tono         | Hex       | Uso                                       |
| ------------ | --------- | ----------------------------------------- |
| `green-50`   | `#f0fdf4` | Fondo de toasts de exito                  |
| `green-100`  | `#dcfce7` | Badges de estado (activo/completado)      |
| `green-200`  | `#bbf7d0` | Bordes de tarjetas                        |
| `green-400`  | `#4ade80` | Bordes de notificaciones                  |
| `green-500`  | `#22c55e` | Focus rings de botones primarios          |
| `green-600`  | `#16a34a` | Botones primarios (CTA)                   |
| `green-700`  | `#15803d` | Hover de botones primarios                |
| `green-800`  | `#166534` | Texto en toasts y badges de estado        |

### 2.4 Indigo (Superadmin y features PRO)

| Tono          | Hex       | Uso                                       |
| ------------- | --------- | ----------------------------------------- |
| `indigo-50`   | `#eef2ff` | Fondo nav activa superadmin, hover        |
| `indigo-100`  | `#e0e7ff` | Badges "PRO"                              |
| `indigo-600`  | `#4f46e5` | Avatar superadmin, logo, texto badge PRO  |
| `indigo-700`  | `#4338ca` | Texto nav activa superadmin               |

### 2.5 Colores Adicionales por Contexto

| Familia     | Tonos usados                           | Contexto                          |
| ----------- | -------------------------------------- | --------------------------------- |
| **Violet**  | `violet-50`, `violet-600`, `violet-700`| Gradientes superadmin, seguridad  |
| **Purple**  | `purple-50`-`purple-700`, `fuchsia-500/600` | Features ULTRA, IA          |
| **Amber**   | `amber-50`, `amber-100`, `amber-600`  | Advertencias, badges VIP          |
| **Rose**    | `rose-50`, `rose-100`, `rose-500`, `rose-600` | Errores, estados overdue  |
| **Blue**    | `blue-50`, `blue-100`, `blue-400`-`blue-600` | Info, analytics, charts    |
| **Cyan**    | `cyan-400`, `cyan-500`, `cyan-600`    | Stats IA, gradientes              |

### 2.6 Colores Semanticos

| Proposito     | Fondo      | Borde       | Texto       | Contexto                  |
| ------------- | ---------- | ----------- | ----------- | ------------------------- |
| **Exito**     | `green-50` | `green-400` | `green-800` | Toast de exito            |
| **Error**     | `red-50`   | `red-400`   | `red-800`   | Toast de error            |
| **Info**      | `blue-50`  | `blue-400`  | `blue-800`  | Toast informativo         |
| **Peligro**   | `red-600`  | -           | `white`     | Boton de accion peligrosa |
| **VIP**       | `amber-100`| -           | `amber-600` | Badges "VIP"              |
| **ULTRA**     | `purple-100`| -          | `purple-600`| Badges "ULTRA"            |
| **Nuevo**     | `emerald-100`| -         | `emerald-600`| Badges "Nuevo"           |

### 2.7 Colores Especiales (WhatsApp UI)

| Valor       | Uso                                    |
| ----------- | -------------------------------------- |
| `#e5ddd5`   | Fondo de chat WhatsApp                 |
| `#dcf8c6`   | Burbuja de mensaje WhatsApp            |
| `#10b981`   | Color primario por defecto (settings)  |

### 2.8 Neutros (Base de la interfaz)

| Tono          | Hex       | Uso                                       |
| ------------- | --------- | ----------------------------------------- |
| `slate-50`    | `#f8fafc` | Fondo general de la app (`body`)          |
| `slate-100`   | `#f1f5f9` | Fondos secundarios, scrollbar track       |
| `slate-200`   | `#e2e8f0` | Bordes de tarjetas, separadores           |
| `slate-400`   | `#94a3b8` | Texto secundario, labels, scrollbar hover |
| `slate-900`   | `#0f172a` | Texto principal (`body`)                  |
| `gray-100`    | `#f3f4f6` | Hover en botones/menu                     |
| `gray-200`    | `#e5e7eb` | Bordes de header/sidebar                  |
| `gray-300`    | `#d1d5db` | Bordes de inputs por defecto              |
| `gray-400`    | `#9ca3af` | Texto de labels de seccion                |
| `gray-500`    | `#6b7280` | Texto de ayuda (helper text)              |
| `gray-600`    | `#4b5563` | Texto de enlaces inactivos                |
| `gray-700`    | `#374151` | Texto de labels de inputs                 |
| `gray-900`    | `#111827` | Titulos, nombres de tienda                |
| `white`       | `#ffffff` | Fondo de tarjetas, header, sidebar, modal |

---

## 3. Tipografia

### 3.1 Fuente Principal

```css
font-family: 'Inter', system-ui, sans-serif;
```

La fuente **Inter** se carga como fuente del sistema. No se importan fuentes externas via CDN o Google Fonts.

### 3.2 Escala Tipografica

| Clase Tailwind | Tamano  | Uso                                          |
| -------------- | ------- | -------------------------------------------- |
| `text-[8px]`   | 8px     | Badges de tier (PRO, VIP, ULTRA, Nuevo)      |
| `text-[9px]`   | 9px     | Footer de creditos                           |
| `text-[10px]`  | 10px    | Labels de seccion, badges de ciudad, enlaces externos |
| `text-xs`      | 12px    | Mensajes de error, helper text               |
| `text-sm`      | 14px    | Cuerpo general, botones, inputs, nav links   |
| `text-base`    | 16px    | Botones grandes (lg)                         |
| `text-lg`      | 18px    | Titulo del header (nombre de tienda)         |
| `text-xl`      | 20px    | Titulo del modal                             |

### 3.3 Pesos Tipograficos

| Clase Tailwind | Peso | Uso                                            |
| -------------- | ---- | ---------------------------------------------- |
| `font-medium`  | 500  | Botones, links de navegacion, labels de input  |
| `font-semibold`| 600  | Titulo del header, labels de seccion superadmin|
| `font-bold`    | 700  | Logo "VENDExChat", titulo del modal            |
| `font-black`   | 900  | Badges de tier, labels de seccion, creditos, enlaces externos |

### 3.4 Tracking (Espaciado entre letras)

| Clase               | Uso                                          |
| -------------------- | -------------------------------------------- |
| `tracking-tight`     | Titulo del modal                             |
| `tracking-widest`    | Labels de seccion, badges, enlaces externos  |

---

## 4. Componentes Base

### 4.1 Button (`src/components/common/Button.tsx`)

**Variantes:**

| Variante    | Fondo           | Texto           | Hover             | Focus Ring       |
| ----------- | --------------- | --------------- | ----------------- | ---------------- |
| `primary`   | `green-600`     | `white`         | `green-700`       | `green-500`      |
| `secondary` | `white`         | `slate-700`     | `slate-50`        | `slate-300`      |
| `danger`    | `red-600`       | `white`         | `red-700`         | `red-500`        |
| `ghost`     | `transparent`   | `slate-600`     | `slate-50`        | `slate-300`      |
| `outline`   | `transparent`   | `slate-600`     | `slate-50`        | `slate-300`      |

**Tamanos:**

| Tamano | Padding        | Texto      |
| ------ | -------------- | ---------- |
| `sm`   | `px-3 py-1.5`  | `text-sm`  |
| `md`   | `px-4 py-2`    | `text-sm`  |
| `lg`   | `px-6 py-3`    | `text-base`|

**Estilos comunes:** `rounded-lg`, `font-medium`, `focus:ring-2`, `focus:ring-offset-2`, `shadow-sm` (excepto ghost)

### 4.2 Input (`src/components/common/Input.tsx`)

```
Borde:        border gray-300 (defecto) | border red-500 (error)
Padding:      px-3 py-2
Esquinas:     rounded-lg
Texto:        text-sm
Focus:        ring-2 ring-emerald-500, border-emerald-500
Error focus:  ring-2 ring-red-500
Label:        text-sm font-medium text-gray-700
Error msg:    text-xs text-red-600
Helper text:  text-xs text-gray-500
```

### 4.3 Select (`src/components/common/Select.tsx`)

Mismos estilos que Input. Fondo `bg-white`.

### 4.4 Card (`src/components/common/Card.tsx`)

```
Fondo:        bg-white
Esquinas:     rounded-2xl
Borde:        border border-slate-200
Sombra:       shadow-sm
Padding:      p-6 (desactivable)
```

### 4.5 Modal (`src/components/common/Modal.tsx`)

```
Fondo:        bg-white
Esquinas:     rounded-[2rem]
Sombra:       shadow-2xl
Borde:        border border-slate-100
Backdrop:     bg-slate-900/40 backdrop-blur-sm
Animacion:    zoom-in-95, slide-in-from-bottom-4, fade-in (300ms)
Header:       px-8 py-6, border-b border-slate-50
Body:         p-8
Titulo:       text-xl font-bold text-slate-900 tracking-tight
Boton cerrar: rounded-xl, hover:bg-slate-50
```

**Tamanos del modal:**

| Tamano | Max Width  |
| ------ | ---------- |
| `sm`   | `max-w-md` |
| `md`   | `max-w-lg` |
| `lg`   | `max-w-2xl`|

### 4.6 Toast (`src/components/common/Toast.tsx`)

```
Posicion:     fixed top-4 right-4 z-[100]
Esquinas:     rounded-lg
Sombra:       shadow-lg
Padding:      px-4 py-3
Animacion:    animate-fade-in
Auto-cierre:  4 segundos
Iconos:       CheckCircle (exito), XCircle (error), AlertCircle (info)
```

### 4.7 Loading Spinner (`src/components/common/LoadingSpinner.tsx`)

```
Color:        text-emerald-600
Icono:        Loader2 de lucide-react con animate-spin
Texto:        text-sm text-gray-500
```

**Tamanos:** sm (w-4 h-4), md (w-8 h-8), lg (w-12 h-12)

### 4.8 Badge (`src/components/common/Badge.tsx`)

```
Estilo:       inline-flex items-center rounded-full text-xs font-medium
Padding:      px-2.5 py-0.5
Defecto:      bg-gray-100 text-gray-800
Props:        color (clase texto), bg (clase fondo)
```

**Variaciones comunes en la app:**

| Estado    | Fondo         | Texto          | Borde            |
| --------- | ------------- | -------------- | ---------------- |
| Exito     | `emerald-50`  | `emerald-600`  | `emerald-100`    |
| Error     | `rose-50`     | `rose-600`     | `rose-100`       |
| Warning   | `amber-50`    | `amber-600`    | `amber-100`      |
| Info      | `indigo-50`   | `indigo-600`   | `indigo-100`     |

---

## 5. Layout

### 5.1 Header (`src/components/layout/Header.tsx`)

```
Altura:       h-16 (64px)
Fondo:        bg-white
Borde:        border-b border-gray-200
Padding:      px-4 (movil) | px-6 (desktop lg)
```

### 5.2 Sidebar (`src/components/layout/Sidebar.tsx`)

```
Ancho:        w-64 (256px)
Fondo:        bg-white
Borde:        border-r border-gray-200
Responsive:   Fixed overlay en movil, static en lg+
Overlay:      bg-black/50 (z-40)
Transicion:   transform duration-200
```

**Estilos de link de navegacion:**

```
Base:         px-4 py-2.5, rounded-lg, text-sm, font-medium
Inactivo:     text-gray-600, hover:bg-gray-100, hover:text-gray-900
Activo Merchant:   bg-emerald-50, text-emerald-700
Activo Superadmin: bg-indigo-50, text-indigo-700
```

---

## 6. Badges de Tier

| Tier      | Fondo          | Texto          | Estilo                                          |
| --------- | -------------- | -------------- | ----------------------------------------------- |
| **Nuevo** | `emerald-100`  | `emerald-600`  | `text-[8px] font-black uppercase rounded`       |
| **PRO**   | `indigo-100`   | `indigo-600`   | `text-[8px] font-black uppercase rounded`       |
| **VIP**   | `amber-100`    | `amber-600`    | `text-[8px] font-black uppercase rounded`       |
| **ULTRA** | `purple-100`   | `purple-600`   | `text-[8px] font-black uppercase rounded`       |

Todos comparten: `ml-auto px-1.5 py-0.5`

---

## 7. Animaciones Personalizadas

Definidas en `src/index.css`:

| Nombre              | Clase CSS            | Duracion | Efecto                                |
| ------------------- | -------------------- | -------- | ------------------------------------- |
| **fadeIn**           | `animate-fade-in`    | 0.3s     | Opacidad 0->1 + translateY 8px->0    |
| **shimmer**         | `.skeleton`          | 1.5s     | Gradiente animado para skeleton loader|
| **spin-slow**       | `animate-spin-slow`  | 8s       | Rotacion lenta continua               |
| **shake**           | `animate-shake`      | 0.5s     | Vibracion lateral (errores)           |

### Skeleton Loader

```css
background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
background-size: 200% 100%;
animation: shimmer 1.5s infinite;
border-radius: 4px;
```

---

## 8. Scrollbar Personalizado

```css
::-webkit-scrollbar          { width: 6px; }
::-webkit-scrollbar-track    { background: #f1f5f9; }   /* slate-100 */
::-webkit-scrollbar-thumb    { background: #cbd5e1; border-radius: 3px; }  /* slate-300 */
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }  /* slate-400 */
```

---

## 9. Iconografia

**Libreria:** [Lucide React](https://lucide.dev/) v0.563.0

**Tamanos estandar:**

| Contexto              | Tamano       |
| --------------------- | ------------ |
| Navegacion / sidebar  | `w-5 h-5`   |
| Toast / notificacion  | `w-5 h-5`   |
| Boton de cerrar       | `w-4 h-4`   |
| Loading spinner sm    | `w-4 h-4`   |
| Icono de seccion      | `w-3 h-3`   |
| Enlace externo        | `w-3.5 h-3.5`|

**Iconos principales de la app:**

| Icono             | Uso                           |
| ----------------- | ----------------------------- |
| `Store`           | Logo de la app en sidebar     |
| `User`            | Avatar de usuario en header   |
| `LayoutDashboard` | Dashboard                     |
| `ShoppingCart`    | Pedidos                       |
| `Package`         | Productos                     |
| `FolderOpen`      | Categorias                    |
| `Settings`        | Configuracion                 |
| `LogOut`          | Cerrar sesion                 |
| `Bot`             | Asistente / WhatsApp Bot      |
| `Brain`           | CRM IA                        |
| `Cpu`             | Inteligencia IA               |
| `Loader2`         | Spinner de carga              |

---

## 10. Patrones de Esquinas (Border Radius)

| Clase Tailwind   | Uso                                         |
| ---------------- | ------------------------------------------- |
| `rounded`        | Badges de tier                              |
| `rounded-lg`     | Botones, inputs, selects, links de nav, toasts |
| `rounded-xl`     | Boton de cerrar modal, enlaces externos     |
| `rounded-2xl`    | Tarjetas (Card)                             |
| `rounded-[2rem]` | Modal                                       |
| `rounded-full`   | Avatar de usuario                           |

---

## 11. Sombras

| Clase Tailwind | Uso                                     |
| -------------- | --------------------------------------- |
| `shadow-sm`    | Botones, tarjetas, enlaces externos     |
| `shadow-lg`    | Toasts                                  |
| `shadow-xl`    | Elementos flotantes                     |
| `shadow-2xl`   | Modal                                   |
| `shadow-inner` | Sombras internas                        |

**Sombras con color (usadas en paginas):**

| Ejemplo                       | Uso                        |
| ----------------------------- | -------------------------- |
| `shadow-indigo-100`           | Tarjetas superadmin        |
| `shadow-emerald-100`          | Tarjetas merchant          |
| `shadow-purple-100`           | Features IA/ULTRA          |
| `shadow-rose-100`             | Alertas de error           |
| `shadow-blue-100`             | Analytics                  |

---

## 12. Gradientes

| Direccion y Colores                                     | Uso                        |
| ------------------------------------------------------- | -------------------------- |
| `bg-gradient-to-br from-indigo-600 to-indigo-900`       | Cards oscuros superadmin   |
| `bg-gradient-to-br from-indigo-600 to-violet-700`       | Cards destacados           |
| `bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500` | Features IA premium |
| `bg-gradient-to-br from-cyan-600 to-blue-600`           | Analytics                  |
| `bg-gradient-to-br from-green-500 to-emerald-600`       | Cards merchant             |
| `bg-gradient-to-r from-emerald-600 to-teal-700`         | Gradiente horizontal marca |
| `bg-gradient-to-t from-black/60 to-transparent`         | Overlay sobre imagenes     |

---

## 13. Tablas

```
Header fondo:   bg-slate-50/50
Header texto:   text-[10px] font-black uppercase text-slate-400 tracking-widest
Header padding: px-8 py-5
Filas hover:    hover:bg-slate-50/50 transition-colors group
Divisor:        divide-y divide-slate-50
Celdas texto:   text-sm font-bold text-slate-900
```

---

## 14. Breakpoints Responsive

| Breakpoint | Tamano | Uso principal                              |
| ---------- | ------ | ------------------------------------------ |
| `sm`       | 640px  | Mostrar elementos ocultos en movil         |
| `md`       | 768px  | Texto adicional (ej: "Cambiar Sucursal")   |
| `lg`       | 1024px | Sidebar estatica, ocultar hamburger menu   |
| `xl`       | 1280px | Layouts expandidos                         |

**Patrones responsive comunes:**

```
hidden sm:flex      → Visible desde 640px
hidden sm:block     → Visible desde 640px
hidden md:inline    → Visible desde 768px
lg:hidden           → Oculto desde 1024px (hamburger menu)
lg:translate-x-0    → Sidebar visible desde 1024px
lg:static           → Sidebar static desde 1024px
```

---

## 15. Stack Tecnologico

| Tecnologia           | Version  | Proposito                      |
| -------------------- | -------- | ------------------------------ |
| React                | 19.2.0   | UI Framework                   |
| TypeScript           | 5.9.3    | Tipado estatico                |
| Vite                 | 7.2.4    | Build tool                     |
| Tailwind CSS         | 4.1.18   | Framework de estilos           |
| React Router DOM     | 7.13.0   | Enrutamiento SPA               |
| Supabase             | 2.96.0   | Backend (auth, DB, storage)    |
| lucide-react         | 0.563.0  | Iconos                         |
| sonner               | 2.0.7    | Notificaciones (alternativa)   |
| @dnd-kit             | 6.3.1    | Drag-and-drop                  |
| MercadoPago SDK      | 1.0.7    | Pagos                          |
| tesseract.js         | 7.0.0    | OCR                            |
| xlsx                 | 0.18.5   | Hojas de calculo               |
| qrcode               | 1.5.4    | Generacion de QR               |
