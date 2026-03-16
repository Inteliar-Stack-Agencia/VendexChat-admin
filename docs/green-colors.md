# Tonos de Verde del Sistema

El sistema utiliza **3 familias de verde** de la paleta por defecto de Tailwind CSS. No se definen colores verdes personalizados.

## 1. Emerald (Principal — 93.5% del uso)

| Tono            | Hex Tailwind | Uso principal                              |
| --------------- | ------------ | ------------------------------------------ |
| `emerald-50`    | `#ecfdf5`    | Fondos hover/focus, tarjetas               |
| `emerald-100`   | `#d1fae5`    | Badges, notificaciones                     |
| `emerald-200`   | `#a7f3d0`    | Bordes, sombras                            |
| `emerald-300`   | `#6ee7b7`    | Bordes de focus en inputs                  |
| `emerald-400`   | `#34d399`    | Indicadores animados (pulso), iconos       |
| `emerald-500`   | `#10b981`    | Focus rings, spinners, acentos             |
| `emerald-600`   | `#059669`    | Avatares, botones primarios, spinners      |
| `emerald-700`   | `#047857`    | Hover en enlaces, navegacion activa        |
| `emerald-800`   | `#065f46`    | Texto oscuro sobre fondos claros           |
| `emerald-900`   | `#064e3b`    | Texto muy oscuro (uso limitado)            |

## 2. Green (Secundario — 6% del uso)

| Tono         | Hex Tailwind | Uso principal                             |
| ------------ | ------------ | ----------------------------------------- |
| `green-50`   | `#f0fdf4`    | Fondo de toasts de exito                  |
| `green-100`  | `#dcfce7`    | Badges de estado (activo/completado)      |
| `green-200`  | `#bbf7d0`    | Bordes de tarjetas                        |
| `green-400`  | `#4ade80`    | Bordes de notificaciones                  |
| `green-500`  | `#22c55e`    | Gradientes, focus rings de botones        |
| `green-600`  | `#16a34a`    | Botones primarios (Button.tsx)            |
| `green-700`  | `#15803d`    | Hover de botones                          |
| `green-800`  | `#166534`    | Texto en toasts y badges                  |

## 3. Teal (Minimo — <1%)

| Tono        | Hex Tailwind | Uso principal                    |
| ----------- | ------------ | -------------------------------- |
| `teal-100`  | `#ccfbf1`    | Badges de estado de clientes     |
| `teal-700`  | `#0f766e`    | Gradientes en dashboard          |

## Uso por Componente

| Componente          | Color principal   | Colores secundarios              | Proposito                   |
| ------------------- | ----------------- | -------------------------------- | --------------------------- |
| Navegacion/Sidebar  | `emerald-600/700` | `emerald-50, emerald-100`        | Estados activos, branding   |
| Botones primarios   | `green-600`       | `green-500, green-700`           | Acciones CTA                |
| Inputs (focus)      | `emerald-500`     | `emerald-300, emerald-600`       | Anillos y bordes de foco    |
| Toast exito         | `green-50`        | `green-400, green-800`           | Notificaciones de exito     |
| Loading Spinner     | `emerald-600`     | -                                | Indicadores de carga        |
| WhatsApp Bot UI     | `green-600`       | `emerald-600, green-50/200/500`  | Estilo WhatsApp             |
| Badges de estado    | `green-100`       | `green-800`                      | Estado activo/completado    |
| Avatar de usuario   | `emerald-600`     | `emerald-50`                     | Identificacion de usuario   |
| Checklist onboarding| `emerald-50`      | `emerald-500, emerald-600`       | Indicadores de completado   |

## Estadisticas

- **Total de usos de clases verdes**: ~306
- **Emerald**: 286 usos (93.5%)
- **Green**: 18 usos (5.9%)
- **Teal**: 2 usos (0.65%)
- **Tonos unicos**: 20
- **Archivos con colores verdes**: 55+

## Nota

Todos los colores provienen de la paleta por defecto de Tailwind CSS. No existe un archivo `tailwind.config.ts` con colores personalizados.
