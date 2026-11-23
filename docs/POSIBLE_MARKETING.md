# Posible marketing

El detalle del pedido muestra un check discreto junto al número en Preparación, Estampado y Empaquetado. Guarda la candidatura mediante `setPossibleMarketing` y conserva los valores recibidos desde el pedido compartido con Sistema Gestión.

Marketing aprueba/desaprueba en ERP Marketing y recibe los cambios de estado de los pedidos aceptados. El visor no espera esa decisión para iniciar, avanzar, imprimir o despachar; no cambió ninguna de esas transacciones.

`PossibleMarketingCheck.jsx` presenta el control; `services/orders.js` incorpora los dos campos a la normalización y caché ya existentes. No se agregan listeners por pedido. El campo sigue visible al navegar entre áreas y su título explica el resultado de Marketing.

Validación: build Vite y 19 pruebas de transacciones/caché, incluyendo un caso que avanza cada área con decisiones pendiente, aprobada, rechazada y finalizada. Integración y activación documentadas en `docs/pedidos-para-contenido.md` del proyecto ERP Marketing. El despliegue de producción sigue pendiente.
