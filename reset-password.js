// Script para resetear contraseña
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // Nueva contraseña: admin123
  const newPassword = 'admin123';
  const hash = await bcrypt.hash(newPassword, 10);
  
  await connection.query(
    'UPDATE usuarios SET password_hash = ? WHERE email = ?',
    [hash, 'admin@mrfrio.com']
  );

  console.log('✅ Contraseña reseteada exitosamente!\n');
  console.log('   📧 Email: admin@mrfrio.com');
  console.log('   🔑 Nueva contraseña: admin123\n');

  await connection.end();
}

resetPassword().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
