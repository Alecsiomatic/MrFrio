// Script para analizar la base de datos
require('dotenv').config();
const mysql = require('mysql2/promise');

async function analyzeDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('✅ Conexión exitosa a:', process.env.DB_NAME);
  console.log('📍 Host:', process.env.DB_HOST);
  console.log('\n' + '='.repeat(50));

  // Obtener tablas
  const [tables] = await connection.query('SHOW TABLES');
  console.log('\n📋 TABLAS EN LA BASE DE DATOS:');
  
  if (tables.length === 0) {
    console.log('   ⚠️  No hay tablas - Base de datos vacía');
  } else {
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      
      // Contar registros
      const [countResult] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
      const count = countResult[0].count;
      
      // Obtener estructura
      const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
      
      console.log(`\n   📁 ${tableName} (${count} registros)`);
      console.log('      Columnas:', columns.map(c => c.Field).join(', '));
    }
  }

  console.log('\n' + '='.repeat(50));
  await connection.end();
}

analyzeDB().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
