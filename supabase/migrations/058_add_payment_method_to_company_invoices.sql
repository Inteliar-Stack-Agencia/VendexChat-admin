-- Medio de pago con el que se cobró la factura (efectivo/qr/transferencia/tarjeta),
-- igual que ya se trackea en orders.metadata.payment_method para pedidos sueltos.
ALTER TABLE company_invoices ADD COLUMN payment_method text;
