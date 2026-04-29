# Guía de Migración a Estructura MVC

## Estado Actual

✅ **Backend**: Completamente reorganizado a módulos MVC  
✅ **Frontend**: Servicios movidos a features, estructura lista  
⚠️ **Componentes**: Aún usan rutas antiguas (src/services/), pero funcionan

## Por qué la migración es gradual

- Los **servicios antiguos** en `src/services/` se han **duplicado** en `src/app/features/*/services/`
- Los **componentes existentes** seguirán funcionando sin cambios
- Se pueden **migrar incrementalmente**, componente por componente
- **Sin downtime** ni cambios disruptivos

---

## Cómo Migrar un Componente

### Antes (Estructura Antigua)

```typescript
// src/app/components/catalogo/catalogo.ts
import { ProductsService } from '../../services/producto.service';
import { CartService } from '../../services/cart.service';

export class CatalogoComponent {
  private productoService = inject(ProductsService);
  private cartService = inject(CartService);
}
```

### Después (Estructura MVC por Features)

```typescript
// src/app/components/catalogo/catalogo.ts
import { ProductsService } from '../../features/products';
import { CartService } from '../../features/cart';

export class CatalogoComponent {
  private productoService = inject(ProductsService);
  private cartService = inject(CartService);
}
```

**Cambios**:
- `../../services/producto.service` → `../../features/products` (usa el `index.ts`)
- `../../services/cart.service` → `../../features/cart`

---

## Próximos Pasos de Migración (Recomendado)

### 1️⃣ Mover Componentes a Features

Ejemplo: `catalogo` → `features/products/components/catalogo/`

```
ANTES:
src/app/
├── components/
│   └── catalogo/
│       ├── catalogo.ts
│       └── catalogo.html
└── services/
    └── producto.service.ts

DESPUÉS:
src/app/
└── features/
    └── products/
        ├── components/
        │   └── catalogo/
        │       ├── catalogo.ts
        │       └── catalogo.html
        └── services/
            └── products.service.ts
```

### 2️⃣ Crear Feature Routes

```typescript
// src/app/features/products/products.routes.ts
export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    component: CatalogoComponent,
  }
];
```

### 3️⃣ Actualizar app.routes.ts

```typescript
// src/app/app.routes.ts
const routes: Routes = [
  {
    path: 'products',
    children: () => import('./features/products/products.routes')
      .then(m => m.PRODUCTS_ROUTES)
  },
  {
    path: 'checkout',
    loadComponent: () => import('./features/checkout/components/checkout/checkout.component')
      .then(m => m.CheckoutComponent)
  }
];
```

---

## Archivo de Importación Pública (`index.ts`)

Cada feature exporta su API pública vía `index.ts`:

```typescript
// src/app/features/products/index.ts
export * from './services/products.service';
export * from './components/catalogo/catalogo.component'; // (si quieres compartir)
```

Beneficios:
- Otros módulos no necesitan conocer la estructura interna
- Cambios internos no rompen imports externos
- API clara y explícita

---

## Limpieza (Fase Final)

Una vez que todos los componentes se hayan migrado:

1. **Eliminar `src/components/`**
2. **Eliminar `src/services/`** (esos archivos existen en features ahora)
3. **Eliminar `src/models/`** (opcional: mover a shared/models si es compartido)

---

## Checklist de Migración

### Backend ✅
- [x] Módulos creados: products, cart, paypal
- [x] Controllers, Services, Routes definidos
- [x] server.js registra todos los módulos
- [x] Tests:
  ```bash
  npm run backend:start
  curl http://localhost:3000/api/health
  ```

### Frontend 🔄
- [x] Features creados: products, cart, checkout
- [x] Servicios movidos a features
- [x] index.ts en cada feature exporta servicios
- [ ] Componentes actualizados con nuevos imports
- [ ] Eliminar src/services/ y src/components/ (cuando esté listo)

---

## Comandos Útiles

```bash
# Validar backend
npm run backend:start
curl http://localhost:3000/api/health

# Validar frontend
npm run frontend:build

# Iniciar dev server
npm run frontend:start

# Build completo
npm run build
```

---

## Notas Importantes

### 🔒 No Romper Nada
Los servicios antiguos en `src/services/` **se mantienen como está** mientras se migra todo. Sin riesgo de fallos.

### 📦 Tree Shaking
Los servicios duplicados pueden causar **bundle más grande temporalmente**. Una vez completada la migración, elimina los antiguos.

### 🧪 Testing
Cada feature debería tener su propio spec.ts:
```
features/products/
└── services/
    ├── products.service.ts
    └── products.service.spec.ts
```

### 🚀 Deploy Seguro
- Deploy con ambas versiones activas (backend 100% MVC, frontend gradual)
- No hay cambios en API REST
- Solo cambios de organización interna del código

