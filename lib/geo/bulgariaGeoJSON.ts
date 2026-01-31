/**
 * Simplified GeoJSON for Bulgarian regions (districts)
 * Coordinates are approximate center points for demonstration
 */
export const bulgariaGeoJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "София-град", "name_en": "Sofia City", "code": "BG411" },
      "geometry": { "type": "Point", "coordinates": [23.3219, 42.6977] }
    },
    {
      "type": "Feature",
      "properties": { "name": "Пловдив", "name_en": "Plovdiv", "code": "BG421" },
      "geometry": { "type": "Point", "coordinates": [24.7453, 42.1354] }
    },
    {
      "type": "Feature",
      "properties": { "name": "Варна", "name_en": "Varna", "code": "BG331" },
      "geometry": { "type": "Point", "coordinates": [27.9147, 43.2141] }
    },
    {
      "type": "Feature",
      "properties": { "name": "Бургас", "name_en": "Burgas", "code": "BG341" },
      "geometry": { "type": "Point", "coordinates": [27.4626, 42.5048] }
    },
    {
      "type": "Feature",
      "properties": { "name": "Русе", "name_en": "Ruse", "code": "BG324" },
      "geometry": { "type": "Point", "coordinates": [25.9656, 43.8489] }
    },
    {
      "type": "Feature",
      "properties": { "name": "Стара Загора", "name_en": "Stara Zagora", "code": "BG344" },
      "geometry": { "type": "Point", "coordinates": [25.6325, 42.4249] }
    }
  ]
};
