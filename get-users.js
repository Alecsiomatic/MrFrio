// Script para ver usuarios
require('dotenv').config();
const mysql = require('mysql2/promise');

async function getUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('👥 USUARIOS EN LA BASE DE DATOS:\n');
  
  const [users] = await connection.query(`
    SELECT id, nombre, email, role, is_active, rutero_id, password_hash 
    FROM usuarios
  `);
  
  users.forEach(user => {
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Nombre: ${user.nombre}`);
    console.log(`   🔑 Rol: ${user.role}`);
    console.log(`   ✅ Activo: ${user.is_active ? 'Sí' : 'No'}`);
    console.log(`   🔒 Password Hash: ${user.password_hash.substring(0, 20)}...`);
    console.log('   ---');
  });

  console.log('\n⚠️  Las contraseñas están encriptadas con bcrypt.');
  console.log('   No es posible recuperarlas, solo resetearlas.\n');

  await connection.end();
}

getUsers().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
