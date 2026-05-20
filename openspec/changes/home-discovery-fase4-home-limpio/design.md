# Diseño — Fase 4 home limpio

## Orden del ScrollView

1. HomeTopBar  
2. HomeVehicleSelector (+ chip salud)  
3. HomeQuickActions  
4. HomeParaTiSection  
5. HomeNearbySection  
6. HomeMarketActivitySection  
7. HomeVehicleDashboardFold (colapsado)

## Colapsable

- Título: «Patrimonio, clima y viajes»
- Subtítulo colapsado: resumen Salud · Valor · Clima (y «Viaje en curso» si aplica)
- `defaultExpanded={false}`; `forceExpanded={tripActive}`

## Hooks

- `useHomeTripTracking`: GPS viaje + modal confirmación (lógica extraída del screen).
