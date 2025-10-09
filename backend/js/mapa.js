// Inicializar el mapa centrado en Bogotá
const map = L.map('map').setView([4.65, -74.08], 13);

// Cargar el mapa base desde OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
}).addTo(map);

// Lista de médicos con coordenadas
const medicos = [
  { nombre: 'Dra. Carolina Sanchez', especialidad: 'Pediatra', lat: 4.8510, lng: -74.0830 },
  { nombre: 'Dr. Geronimo Sanchez', especialidad: 'Cardiologo', lat: 4.5125, lng: -74.0905 },
  { nombre: 'Dra. Leidy Paez', especialidad: 'Psiquiatra', lat: 4.6932, lng: -74.1254 },
  { nombre: 'Dr. Yamid Lara', especialidad: 'Oftalmologo', lat: 4.6378, lng: -74.0819 },
  { nombre: 'Dra. Angie leon', especialidad: 'Ginecologa', lat: 4.6612, lng: -74.1686 },
  { nombre: 'Dr. Cristian Perez', especialidad: 'Neurologo', lat: 4.5555, lng: -74.0921 }
];

// Agregar los marcadores al mapa
medicos.forEach(medico => {
  L.marker([medico.lat, medico.lng])
    .addTo(map)
    .bindPopup(`<b>${medico.nombre}</b><br>${medico.especialidad}`)
});
