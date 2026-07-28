# Payment Tracking & P&L Computation Flow

## Resumen Ejecutivo

Cuando registras un pago en una factura de Morfi Empresas:

1. **Ingresas el monto real pagado** (después de descuentos)
2. **Se guarda en `paid_amount`** de la orden
3. **El P&L lee `paid_amount`** como ingreso real para ese mes
4. **La caja cuadra** porque usas el dinero que realmente recibiste

---

## Flujo Detallado

### Step 1: Crear Factura
```
DespachoS + PedidoS → Factura
  - Items con precios negociados
  - Algunos items descontrenan (descuento aplicado)
  - Total = suma_items (con descuentos ya incluidos)
  
Ejemplo:
  Item 1: $500.000
  Item 2: $400.000 (con 20% descuento) = $320.000
  ─────────────────────
  Total Factura: $820.000
```

### Step 2: Marcar como Pagado
```
Usuario ingresa en UI:
  "Monto pagado: $820.000"
  
Se registra en BD:
  orders.paid_amount = 820.000
  orders.payment_status = 'paid'
  orders.paid_at = fecha
```

### Step 3: P&L Lee el Pago
```
P&L Query (mes actual):

SELECT SUM(paid_amount) as ingresos
FROM orders
WHERE payment_status = 'paid'
  AND paid_at >= '2026-07-01'
  AND paid_at <= '2026-07-31'
  AND store_id = 'morfi-laplata'

Resultado: $820.000 ← Ingreso real del mes
```

### Step 4: Balance de Caja Cuadra
```
Ingresos P&L: $820.000
Efectivo recibido: $820.000
Diferencia: $0 ✅ CUADRA
```

---

## ¿Qué pasa si Pagaron Menos?

Si la factura dice $820.000 pero pagaron $750.000 (negociación/descuento adicional):

### Paso 1: Registras el Pago Real
```
Usuario ingresa:
  "Monto pagado: $750.000"
```

### Paso 2: Se Guarda
```
orders.paid_amount = 750.000  ← Lo que realmente pagaron
orders.payment_status = 'paid'
```

### Paso 3: P&L suma 750.000
```
SELECT SUM(paid_amount) → $750.000 ← Ingreso real
```

### Paso 4: Caja Cuadra
```
Ingresos P&L: $750.000
Efectivo en caja: $750.000
Diferencia: $0 ✅ CUADRA
```

---

## Ejemplo Completo — Mes de Julio

**Factura 1 (Jota Producciones):**
- Total factura: $682.198 (con descuentos incluidos)
- Ingresaste en "Monto pagado": $682.198
- P&L lee: $682.198

**Factura 2 (AVSA):**
- Total factura: $200.000
- Pagaron: $180.000 (descuento adicional)
- Ingresaste en "Monto pagado": $180.000
- P&L lee: $180.000

**Factura 3 (Barzi Foods):**
- Total factura: $300.000
- Todavía no pagaron
- payment_status = 'pending'
- P&L lee: $0 (no incluida)

**Total P&L Julio:**
```
$682.198 + $180.000 + $0 = $862.198
```

**Total Caja Julio:**
```
Recibido de Jota: $682.198
Recibido de AVSA: $180.000
Total en caja: $862.198 ✅ COINCIDE CON P&L
```

---

## Detalles Técnicos

### Base de Datos

```sql
-- Tabla orders
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  store_id UUID,
  total DECIMAL,              -- Total original de factura
  payment_status TEXT,        -- 'pending' | 'paid' | 'partial'
  paid_amount DECIMAL,        -- LO QUE REALMENTE PAGARON ← Esto es lo que usa P&L
  paid_at TIMESTAMP,          -- Cuándo pagaron
  payment_notes TEXT,
  created_at TIMESTAMP
);
```

### Query P&L

```sql
-- P&L calcula ingresos del mes sumando pagos reales
SELECT 
  DATE_TRUNC('month', paid_at) as mes,
  SUM(paid_amount) as ingresos_reales
FROM orders
WHERE store_id = 'morfi-laplata'
  AND payment_status IN ('paid', 'partial')
  AND paid_at >= '2026-07-01'
  AND paid_at <= '2026-07-31'
GROUP BY DATE_TRUNC('month', paid_at)
ORDER BY mes DESC;
```

### Cómo se Usa en P&L Actual

En `expensesApi.getMonthlyRevenue()`:

```typescript
// Si la orden está marcada como PAGADA, usa paid_amount (ingreso real)
if (order.payment_status === 'paid' && order.paid_amount) {
  return {
    created_at: order.paid_at || order.created_at,
    total: Number(order.paid_amount),  // ← CANTIDAD REAL QUE PAGARON
  }
}

// Si aún no pagaron, usa items calculados (proyección)
return {
  created_at: order.created_at,
  total: calculateFromItems(order.items),  // ← Proyección si no está pagado
}
```

---

## Casos de Uso

### ✅ Correcto: Factura $682.198, Pagó $682.198
```
Ingresas: $682.198
P&L suma: $682.198
Caja: +$682.198
Estado: ✓ Cuadra
```

### ✅ Correcto: Factura $400.000, Pagó $350.000
```
Ingresas: $350.000  ← El dinero REAL que recibiste
P&L suma: $350.000
Caja: +$350.000
Estado: ✓ Cuadra (la factura original se renegció)
```

### ❌ INCORRECTO: Ingresas $682.198 pero pagaron $650.000
```
Ingresas: $682.198  ← MONTO INCORRECTO
P&L suma: $682.198
Caja: +$650.000  ← Menos dinero real
Diferencia: -$32.198
Estado: ✗ NO cuadra
```

---

## Recomendación

**Siempre ingresa lo que REALMENTE pagaron**, no el total de la factura original.

Si:
- Factura original: $680.000
- Descuento negociado: $30.000
- Lo que pagaron: $650.000

**Ingresa: $650.000**

De esa forma:
- Factura muestra $680.000 (histórico)
- P&L registra $650.000 (ingreso real)
- Caja cuadra perfectamente

---

## Troubleshooting

Si el P&L no cuadra con caja:

1. **Revisa que `payment_status = 'paid'`** para todas las facturas que ingresaste dinero
2. **Verifica `paid_amount`** = dinero que realmente recibiste (no el total original)
3. **Suma manual**: ¿$X recibida en julio + $Y recibida = total P&L?
4. **Revisa `paid_at`** = fecha correcta del mes

---

## Nota Final

El sistema usa `paid_amount` porque:
- ✅ Refleja dinero REAL recibido
- ✅ Permite descuentos/negociaciones
- ✅ Caja cuadra exactamente
- ✅ P&L es preciso (no proyecciones)

Por eso es importante **siempre ingresar el monto real pagado**, no estimaciones.
