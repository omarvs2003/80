const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Importa y configura dotenv
require('dotenv').config();

// Middleware para parsear JSON
app.use(express.json());

// Sirve archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Variables de entorno para PayPal
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

// Verifica que las variables de entorno estén definidas
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: PAYPAL_CLIENT_ID y/o PAYPAL_CLIENT_SECRET no están definidos en el archivo .env');
  process.exit(1); // Termina la aplicación si las credenciales no están disponibles
}

// Ruta principal para verificar el estado del servidor
app.get('/', (req, res) => {
  console.log(`[${new Date().toISOString()}] Solicitud GET a la ruta raíz recibida.`);
  res.send('¡Servidor de Pago con PayPal está funcionando correctamente!');
});

// Ruta para procesar el pago
app.post('/process_payment', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Solicitud POST recibida en /process_payment.`);

  const orderData = {
    intent: 'CAPTURE',
    payer: {
      phone: {
        phone_type: 'MOBILE'
      }
    },
    purchase_units: [{
      amount: {
        currency_code: 'USD',
        value: '1.00' // Monto del pago
      }
    }],
    application_context: {
      shipping_preference: 'SET_PROVIDED_ADDRESS'
    }
  };

  try {
    console.log(`[${new Date().toISOString()}] Solicitando token de acceso a PayPal.`);

    // Obtén un token de acceso
    const authResponse = await axios.post(
      'https://api-m.paypal.com/v1/oauth2/token',  // URL de producción
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const token = authResponse.data.access_token;
    console.log(`[${new Date().toISOString()}] Token de acceso obtenido: ${token}`);

    console.log(`[${new Date().toISOString()}] Creando pedido en PayPal.`);

    // Crea el pedido
    const orderResponse = await axios.post(
      'https://api-m.paypal.com/v2/checkout/orders',  // URL de producción
      orderData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log(`[${new Date().toISOString()}] Pedido creado exitosamente:`, orderResponse.data);

    res.json(orderResponse.data);
  } catch (error) {
    if (error.response) {
      console.error(`[${new Date().toISOString()}] Error al procesar el pago. Estado: ${error.response.status}`);
      console.error('Datos del error:', error.response.data);
    } else {
      console.error(`[${new Date().toISOString()}] Error al procesar el pago: ${error.message}`);
    }
    res.status(500).send('Error procesando el pago');
  }
});

// Ruta para capturar el pago y obtener el número de teléfono
app.post('/capture_payment/:orderID', async (req, res) => {
  const { orderID } = req.params;
  console.log(`[${new Date().toISOString()}] Capturando pago para Order ID: ${orderID}`);

  try {
    console.log(`[${new Date().toISOString()}] Solicitando token de acceso a PayPal para capturar el pago.`);

    // Obtén un token de acceso
    const authResponse = await axios.post(
      'https://api-m.paypal.com/v1/oauth2/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        auth: {
          username: CLIENT_ID,
          password: CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const token = authResponse.data.access_token;
    console.log(`[${new Date().toISOString()}] Token de acceso obtenido para captura: ${token}`);

    console.log(`[${new Date().toISOString()}] Capturando pedido en PayPal.`);

    // Captura el pedido
    const captureResponse = await axios.post(
      `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log(`[${new Date().toISOString()}] Pedido capturado exitosamente:`, captureResponse.data);

    // Accede a los detalles del comprador
    const payer = captureResponse.data.payer;

    // Verifica si el número de teléfono está disponible
    if (payer.phone && payer.phone.phone_number) {
      const phoneNumber = payer.phone.phone_number.national_number;
      console.log(`[${new Date().toISOString()}] Número de teléfono del comprador: ${phoneNumber}`);
      // Aquí puedes almacenar o utilizar el número de teléfono según tus necesidades
    } else {
      console.log(`[${new Date().toISOString()}] El número de teléfono no está disponible para esta transacción.`);
    }

    res.json(captureResponse.data);
  } catch (error) {
    if (error.response) {
      console.error(`[${new Date().toISOString()}] Error al capturar el pago. Estado: ${error.response.status}`);
      console.error('Datos del error:', error.response.data);
    } else {
      console.error(`[${new Date().toISOString()}] Error al capturar el pago: ${error.message}`);
    }
    res.status(500).send('Error capturando el pago');
  }
});

// Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Servidor corriendo en el puerto ${PORT}`);
});