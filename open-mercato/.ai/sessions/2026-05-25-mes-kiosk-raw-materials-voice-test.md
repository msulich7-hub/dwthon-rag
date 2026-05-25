# Sesja głosowa → MES kiosk — zapotrzebowanie na surowce

**Data:** 2026-05-25  
**Moduł:** `mes` (`apps/mercato/src/modules/mes/`)  
**Intencja:** `change_module` (UI format, bez logiki ilości)

## Transkrypcja (żądanie użytkownika)

> W module MES, w kiosku, ma być wyraźny panel — jedno kliknięcie i format, w którym można zamówić surowce potrzebne do zlecenia. Wybór ile zamówień zaopatrzenia wysłać. Na razie sam format, bez liczenia ilości. Docelowo: przycisk głosu „potrzebuję surowców na 8 godzin, do 6 palet” i system sam liczy — **nie w tej iteracji**.

## Rozstrzygnięcie

| Pole | Wartość |
|------|---------|
| `module_id` | `mes` |
| `scope` | `backend/mes/operator`, kiosk `?kiosk=1` |
| MVP | Panel hero + strona `/backend/mes/operator/raw-materials` |

## Zaimplementowano

- `MesKioskRawMaterialsHero` na kolejce operatora (kiosk)
- Formularz: zlecenie z kolejki, liczba zamówień (1/2/3/5/10), lista materiałów placeholder, sekcja głosu (disabled)
- Trasy: `MES_ROUTES.operatorRawMaterials`, `operatorRawMaterialsKiosk(workOrderId?)`

## Kolejna faza (out of scope)

- BOM z katalogu / ERP
- Kalkulacja z mowy (godziny, palety)
- API persistence `mes_raw_material_requests`
