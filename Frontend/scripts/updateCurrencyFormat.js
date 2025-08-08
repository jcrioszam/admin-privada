const fs = require('fs');
const path = require('path');

// Función para actualizar el formato de moneda en un archivo
function updateCurrencyFormat(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;

    // Agregar import si no existe
    if (!content.includes('formatCurrency') && content.includes('toLocaleString')) {
      const importLine = "import { formatCurrency } from '../utils/currencyFormatter';";
      const lastImportIndex = content.lastIndexOf('import');
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex) + 1;
        content = content.slice(0, nextLineIndex) + importLine + '\n' + content.slice(nextLineIndex);
        updated = true;
      }
    }

    // Reemplazar patrones de moneda
    const patterns = [
      // Patrón: ${amount.toLocaleString()}
      {
        regex: /\$\{([^}]+)\.toLocaleString\(\)\}/g,
        replacement: '{formatCurrency($1)}'
      },
      // Patrón: ${amount.toLocaleString('es-MX')}
      {
        regex: /\$\{([^}]+)\.toLocaleString\('es-MX'\)\}/g,
        replacement: '{formatCurrency($1)}'
      },
      // Patrón: `$${amount.toLocaleString()}`
      {
        regex: /\$\$\{([^}]+)\.toLocaleString\(\)\}/g,
        replacement: '{formatCurrency($1)}'
      },
      // Patrón: `$${amount.toLocaleString('es-MX')}`
      {
        regex: /\$\$\{([^}]+)\.toLocaleString\('es-MX'\)\}/g,
        replacement: '{formatCurrency($1)}'
      },
      // Patrón: $amount.toLocaleString()
      {
        regex: /\$([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\.toLocaleString\(\))/g,
        replacement: '{formatCurrency($1)}'
      },
      // Patrón: $amount.toLocaleString('es-MX')
      {
        regex: /\$([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*\.toLocaleString\('es-MX'\))/g,
        replacement: '{formatCurrency($1)}'
      }
    ];

    patterns.forEach(pattern => {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        updated = true;
      }
    });

    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Función para procesar directorio recursivamente
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processDirectory(filePath);
    } else if (file.endsWith('.js') && file !== 'updateCurrencyFormat.js') {
      updateCurrencyFormat(filePath);
    }
  });
}

// Procesar el directorio src
const srcPath = path.join(__dirname, '..', 'src');
console.log('🔄 Updating currency format in all files...');
processDirectory(srcPath);
console.log('✅ Currency format update completed!'); 