# Casos de prueba compartidos

Cada archivo `test-cases/*.json` es un diagrama con el resultado esperado de las reglas:

```json
{
  "name": "…",
  "diagram": { "els": [ { "id": "a", "t": "red", "f": { … }, "rama": 1 } ] },
  "expect": {
    "meterType": "Indirecta",
    "fuse": null,
    "checks": [ { "level": "warn", "text": "…" } ],
    "summaries": { "a": "MT · 13.2 kV" }
  }
}
```

- Los campos que no se escriben toman el valor por defecto del catálogo.
- `fuse.In` se compara con 3 decimales de tolerancia.
- `summaries` es opcional: solo se revisan los elementos que aparecen.

Los usan **pytest** (`backend/tests/test_shared_cases.py`) y **Vitest**
(`frontend/tests/rules.test.ts`). Si una regla cambia en Python, se debe cambiar
también la copia en TypeScript y los dos deben seguir pasando estos casos.
