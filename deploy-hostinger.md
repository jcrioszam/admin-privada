# 🚀 Despliegue en Hostinger VPS - Guía Completa

## 📋 **Requisitos Previos**

### **Plan VPS Recomendado:**
- **Plan:** VPS 2 o superior
- **RAM:** 2GB mínimo
- **Almacenamiento:** 40GB SSD
- **Sistema:** Ubuntu 20.04 LTS

---

## 🛠️ **Paso 1: Configurar VPS**

### **1.1 Acceder al VPS**
```bash
# Conectar via SSH
ssh root@tu-ip-del-vps

# Actualizar sistema
sudo apt update && sudo apt upgrade -y
```

### **1.2 Instalar Node.js**
```bash
# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version
```

### **1.3 Instalar MongoDB**
```bash
# Importar clave pública
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Agregar repositorio
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Iniciar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar estado
sudo systemctl status mongod
```

### **1.4 Instalar PM2 (Gestor de procesos)**
```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 para iniciar con el sistema
pm2 startup
```

---

## 📁 **Paso 2: Subir Código**

### **2.1 Clonar Repositorio**
```bash
# Crear directorio del proyecto
mkdir /var/www/admin-privada
cd /var/www/admin-privada

# Clonar tu repositorio (si está en GitHub)
git clone https://github.com/tu-usuario/admin-privada.git .

# O subir archivos via FTP/SFTP
```

### **2.2 Configurar Backend**
```bash
# Ir al directorio del backend
cd Backend

# Instalar dependencias
npm install

# Crear archivo de configuración
nano config.env
```

### **2.3 Configuración del Backend**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fraccionamiento
JWT_SECRET=tu_secreto_super_seguro_2024
NODE_ENV=production
```

### **2.4 Configurar Frontend**
```bash
# Ir al directorio del frontend
cd ../Frontend

# Instalar dependencias
npm install

# Construir para producción
npm run build
```

---

## 🌐 **Paso 3: Configurar Nginx**

### **3.1 Instalar Nginx**
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### **3.2 Configurar Proxy Reverso**
```bash
# Crear configuración de sitio
sudo nano /etc/nginx/sites-available/admin-privada
```

### **3.3 Configuración Nginx**
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Frontend (React)
    location / {
        root /var/www/admin-privada/Frontend/build;
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Configuración de seguridad
    location ~ /\. {
        deny all;
    }
}
```

### **3.4 Activar Sitio**
```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/admin-privada /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 🔒 **Paso 4: Configurar SSL**

### **4.1 Instalar Certbot**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### **4.2 Obtener Certificado SSL**
```bash
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

---

## 🚀 **Paso 5: Iniciar Aplicación**

### **5.1 Iniciar Backend con PM2**
```bash
cd /var/www/admin-privada/Backend

# Iniciar aplicación
pm2 start server.js --name "admin-privada-backend"

# Guardar configuración
pm2 save

# Verificar estado
pm2 status
```

### **5.2 Verificar Logs**
```bash
# Ver logs del backend
pm2 logs admin-privada-backend

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🔧 **Paso 6: Configuración de Dominio**

### **6.1 En Hostinger:**
1. **Ir al panel de control**
2. **Seleccionar tu dominio**
3. **Configurar DNS:**
   ```
   Tipo: A
   Nombre: @
   Valor: IP_DEL_VPS
   TTL: 300
   ```

### **6.2 Verificar DNS:**
```bash
# Verificar que el dominio apunta al VPS
nslookup tu-dominio.com
```

---

## 📊 **Paso 7: Monitoreo y Mantenimiento**

### **7.1 Comandos Útiles**
```bash
# Ver estado de servicios
sudo systemctl status nginx
sudo systemctl status mongod
pm2 status

# Ver uso de recursos
htop
df -h
free -h

# Ver logs
pm2 logs
sudo journalctl -u nginx
sudo journalctl -u mongod
```

### **7.2 Backup Automático**
```bash
# Crear script de backup
nano /root/backup.sh
```

```bash
#!/bin/bash
# Backup de MongoDB
mongodump --db fraccionamiento --out /backup/$(date +%Y%m%d)

# Backup de archivos
tar -czf /backup/files_$(date +%Y%m%d).tar.gz /var/www/admin-privada

# Eliminar backups antiguos (más de 7 días)
find /backup -name "*.tar.gz" -mtime +7 -delete
find /backup -name "fraccionamiento" -mtime +7 -exec rm -rf {} \;
```

---

## 🛠️ **Solución de Problemas**

### **Error: "Puerto 5000 no disponible"**
```bash
# Verificar qué usa el puerto
sudo netstat -tlnp | grep :5000

# Terminar proceso si es necesario
sudo kill -9 PID_NUMBER
```

### **Error: "MongoDB no conecta"**
```bash
# Verificar estado de MongoDB
sudo systemctl status mongod

# Reiniciar si es necesario
sudo systemctl restart mongod
```

### **Error: "Nginx no funciona"**
```bash
# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 💰 **Costos Estimados**

### **Hostinger VPS:**
- **Plan VPS 2:** $8.95 USD/mes
- **Dominio:** $10-15 USD/año
- **SSL:** Gratuito (Let's Encrypt)

### **Total Mensual:** ~$10 USD

---

## 🎉 **¡Listo para Producción!**

### **URLs de Acceso:**
- **Frontend:** https://tu-dominio.com
- **API:** https://tu-dominio.com/api
- **Health Check:** https://tu-dominio.com/health

### **Verificaciones Finales:**
1. ✅ **Frontend carga correctamente**
2. ✅ **API responde en /api**
3. ✅ **Base de datos conecta**
4. ✅ **SSL funciona**
5. ✅ **Logs sin errores**

¡Tu sistema está listo para producción! 🚀 