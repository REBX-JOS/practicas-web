# MVC Architecture & Best Practices

## Resumen

Tu proyecto ahora sigue un **patrón MVC modular** donde cada módulo/feature tiene su propia estructura completa:
- **Backend**: Módulos independientes con Controllers, Services, Routes, Config
- **Frontend**: Features independientes con Components, Services, Models

---

## Backend: Estructura Modular MVC

### Patrón por Módulo

```
backend/src/modules/[FEATURE_NAME]/
├── controllers/        # Controladores - manejan requests HTTP
├── services/          # Servicios - lógica de negocio
├── routes/            # Rutas - definición de endpoints
├── config/            # Configuración específica (ej: PayPal config)
├── models/            # (Opcional) Modelos de datos
└── index.js           # Exporta el router principal
```

### Responsabilidades

**Controller**: 
- Recibe requests HTTP
- Valida entrada
- Llama servicios
- Retorna respuestas

**Service**:
- Lógica de negocio
- Queries/operaciones BD
- Llamadas a APIs externas
- Sin dependencia HTTP

**Route**:
- Define endpoints
- Mapea métodos HTTP a controladores
- Valida parámetros

**Config**:
- Variables de configuración
- Credenciales
- URLs base

### Ejemplos en tu Proyecto

#### Products Module
```
modules/products/
├── controllers/products.controller.js     # getAll(), getById(), create(), update(), delete()
├── services/                              # (Aquí iría lógica compartida si hubiera)
├── routes/products.routes.js              # GET /api/products, POST /api/products, etc.
└── index.js                               # Exporta router
```

#### Cart Module
```
modules/cart/
├── controllers/cart.controller.js         # getCart(), addItem(), removeItem(), etc.
├── services/                              # (Lógica compartida de carrito)
├── routes/cart.routes.js                  # GET/POST /api/cart/items, etc.
└── index.js
```

#### PayPal Module
```
modules/paypal/
├── controllers/paypal.controller.js       # createOrder(), captureOrder(), getOrder()
├── services/paypal.service.js             # getAccessToken(), createPaypalOrder(), etc.
├── config/paypal.config.js                # PayPal credentials & config
├── routes/paypal.routes.js                # POST /api/paypal/create-order, etc.
└── index.js
```

### Cómo Registrar un Nuevo Módulo

En `backend/src/server.js`:

```javascript
// 1. Importa el módulo
const dashboardRouter = require('./modules/dashboard');

// 2. Registra en Express
app.use('/api/dashboard', dashboardRouter);
```

---

## Frontend: Estructura por Features

### Patrón por Feature

```
app/features/[FEATURE_NAME]/
├── components/
│   ├── [component-name]/
│   │   ├── [component-name].component.ts       # Lógica del componente (controlador)
│   │   ├── [component-name].component.html     # Vista
│   │   ├── [component-name].component.css      # Estilos
│   │   └── [component-name].component.spec.ts  # Tests
├── services/
│   └── [feature].service.ts                    # Lógica de negocio (ej: ProductsService)
├── models/
│   └── [feature].model.ts                      # Tipos/Interfaces
├── [feature].routes.ts                         # Rutas de la feature (lazy loading)
└── index.ts                                    # Exporta servicios/componentes públicos
```

### Responsabilidades

**Component**:
- Gestiona UI y estado local
- Interactúa con servicios
- Renderiza plantillas
- Maneja eventos del usuario

**Service**:
- Llamadas HTTP (via HttpClient)
- Caching/estado compartido
- Lógica de transformación de datos
- Sin dependencia de componentes

**Model**:
- Interfaces/tipos
- Estructuras de datos

### Ejemplos en tu Proyecto

#### Products Feature
```
features/products/
├── components/
│   └── catalogo/
│       ├── catalogo.component.ts
│       ├── catalogo.component.html
│       └── catalogo.component.css
├── services/
│   └── products.service.ts       # Llamadas a GET /api/products
├── models/
│   └── producto.model.ts         # Interface Product
└── index.ts                       # export * from './services/products.service'
```

#### Checkout Feature
```
features/checkout/
├── components/
│   └── checkout/
│       ├── checkout.component.ts    # Maneja flujo PayPal
│       └── checkout.component.html
├── services/
│   └── paypal.service.ts            # Llamadas a /api/paypal/*
└── index.ts
```

---

## Flujo de Datos

### Backend Example: Add Item to Cart

```
Request: POST /api/cart/items
    ↓
[CartRoutes] → /items → cartController.addItem()
    ↓
[CartController] Valida input → Llama service
    ↓
[CartService] (opcional) - Ejecuta lógica
    ↓
[Database] INSERT INTO cart_items
    ↓
Response: { id, totalItems, total, items[] }
```

### Frontend Example: Add Item to Cart

```
User clicks "Agregar al Carrito"
    ↓
[CatalogoComponent] Llama this.cartService.addItem(productId, qty)
    ↓
[CartService] POST /api/cart/items
    ↓
[Backend] Procesa y retorna cart actualizado
    ↓
[Component] Actualiza signal/observable
    ↓
[Template] Reactiva (señal) re-renderiza
```

---

## Crear un Nuevo Módulo (Backend)

### Ejemplo: Dashboard de Órdenes

```
1. Crear estructura:
   backend/src/modules/dashboard/
   ├── controllers/dashboard.controller.js
   ├── services/dashboard.service.js (opcional)
   ├── routes/dashboard.routes.js
   └── index.js

2. Implementar controller (dashboard.controller.js):
   exports.getOrders = async (req, res) => {
     try {
       const [rows] = await pool.query('SELECT * FROM paypal_orders');
       return res.json(rows);
     } catch (error) {
       return res.status(500).json({ error: error.message });
     }
   };

3. Definir routes (dashboard.routes.js):
   const router = express.Router();
   router.get('/orders', dashboardController.getOrders);
   module.exports = router;

4. Exportar (index.js):
   module.exports = require('./routes/dashboard.routes');

5. Registrar en server.js:
   const dashboardRouter = require('./modules/dashboard');
   app.use('/api/dashboard', dashboardRouter);
```

---

## Crear una Nueva Feature (Frontend)

### Ejemplo: Transaction History

```
1. Crear estructura:
   frontend/src/app/features/history/
   ├── components/
   │   └── history-list/
   │       ├── history-list.component.ts
   │       ├── history-list.component.html
   │       └── history-list.component.css
   ├── services/
   │   └── history.service.ts
   ├── models/
   │   └── transaction.model.ts
   ├── history.routes.ts
   └── index.ts

2. Crear service (history.service.ts):
   @Injectable({ providedIn: 'root' })
   export class HistoryService {
     constructor(private http: HttpClient) {}
     
     getTransactions(): Observable<Transaction[]> {
       return this.http.get<Transaction[]>(`/api/dashboard/orders`);
     }
   }

3. Crear componente (history-list.component.ts):
   @Component({
     selector: 'app-history-list',
     standalone: true,
     template: '...'
   })
   export class HistoryListComponent {
     private historyService = inject(HistoryService);
     transactions = toSignal(this.historyService.getTransactions());
   }

4. Agregar a app.routes.ts:
   const routes: Routes = [
     {
       path: 'history',
       loadComponent: () => import('./features/history/components/history-list/history-list.component')
         .then(m => m.HistoryListComponent)
     }
   ];
```

---

## Ventajas de esta Estructura

✅ **Modularidad**: Cada feature es independiente y testeable  
✅ **Escalabilidad**: Agregar nuevos módulos sin afectar existentes  
✅ **Mantenibilidad**: Fácil de entender y cambiar  
✅ **Reusabilidad**: Servicios compartidos entre componentes  
✅ **Separación de responsabilidades**: Cada capa tiene un rol claro  
✅ **Lazy loading (frontend)**: Cargar features bajo demanda  

---

## Estructura Visual Completa

```
practicas/
├── backend/
│   └── src/
│       ├── db.js
│       ├── server.js                     ← Registra todos los módulos
│       ├── modules/
│       │   ├── products/
│       │   │   ├── controllers/
│       │   │   ├── routes/
│       │   │   └── index.js
│       │   ├── cart/
│       │   ├── paypal/
│       │   │   ├── config/
│       │   │   ├── controllers/
│       │   │   ├── services/
│       │   │   ├── routes/
│       │   │   └── index.js
│       │   └── dashboard/               ← NUEVO (próximo)
│       ├── config/
│       └── utils/
│
└── frontend/
    └── src/
        └── app/
            ├── app.routes.ts            ← Registra todas las features
            ├── features/
            │   ├── products/
            │   │   ├── components/catalogo/
            │   │   ├── services/products.service.ts
            │   │   └── index.ts
            │   ├── cart/
            │   ├── checkout/
            │   │   ├── components/
            │   │   ├── services/paypal.service.ts
            │   │   └── index.ts
            │   └── history/             ← NUEVO (próximo)
            ├── core/                    ← Servicios globales
            └── shared/                  ← Componentes reutilizables
```

---

## Tips para Mantener MVC Limpio

1. **No mezcles capas**: Controller no hace queries, Service no maneja HTTP
2. **Reutiliza servicios**: Si 2 componentes necesitan lo mismo, usa 1 servicio
3. **Nombra claramente**: `productController.js`, `paypalService.js`, `cart.routes.js`
4. **Exporta solo lo necesario**: Usa `index.ts` para exponer API pública de cada feature
5. **Testa cada capa**: Controllers y servicios deben ser testables por separado
6. **Documentación**: Comenta flujos complejos

