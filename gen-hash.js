const bcrypt = require('bcryptjs');
bcrypt.hash('Rutero123', 10).then(h => console.log(h));
