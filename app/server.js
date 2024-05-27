// Importa el framework Express y la biblioteca Axios
import express from "express";
import axios from "axios";

// Crea una instancia de la aplicación Express
const app = express();
// Habilita el middleware para analizar el cuerpo de las solicitudes como JSON
app.use(express.json());

// Extrae las variables de entorno necesarias
const { WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT } = process.env;

// Función para enviar un mensaje utilizando el Graph API de Facebook
const sendMessage = async (businessPhoneNumberId, data) => {
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data,
    });
  } catch (error) {
    console.error("Error sending message:", error.response?.data || error.message);
  }
};

// Función para marcar un mensaje como leído utilizando el Graph API de Facebook
const markAsRead = async (businessPhoneNumberId, messageId) => {
  try {
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${businessPhoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      },
    });
  } catch (error) {
    console.error("Error marking message as read:", error.response?.data || error.message);
  }
};

// Maneja las solicitudes POST a la ruta /webhook
app.post("/webhook", async (req, res) => {
  // Registra en la consola el mensaje entrante para propósitos de depuración
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

  // Extrae el mensaje del cuerpo de la solicitud
  const message = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  // Verifica si el mensaje es de texto
  if (message?.type === "text") {
    // Extrae el ID del negocio del número de teléfono y normaliza el mensaje
    const businessPhoneNumberId = req.body.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
    let userMessage = message.text.body.toLowerCase();
    const contact = req.body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0];
    const senderName = contact?.profile?.name || "usuario";
    userMessage = userMessage.replace(/\?/g, '');

    // Normaliza y convierte el mensaje en una lista de palabras clave
    const normalizeText = (text) => {
      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
    };

    const keywords = normalizeText(userMessage);

    // Función para verificar si el mensaje contiene alguna palabra clave
    const containsKeyword = (keywords, keywordList) => {
      return keywords.some(keyword => keywordList.includes(keyword));
    };

    let reply;

    // Respuestas basadas en palabras clave
    switch (true) {
      // Respuesta para saludos
      case containsKeyword(keywords, ["hola", "buenas", "buenos", "días", "tardes", "noches", "ola", "saludos"]):
        reply = {
          messaging_product: "whatsapp",
          to: message.from,
          text: {
            body: `¡Hola, ${senderName}! Gracias por comunicarte con nosotros. ¿Cómo te puedo ayudar?`,
          },
          context: {
            message_id: message.id,
          },
        };
        break;
      // Respuesta para consultas sobre cómo ser parte del centro de formación
      case containsKeyword(keywords, ["cómo", "hacer", "parte", "pertenecer", "inscribo", "inscripción", "entrar", "ingresar", "matriculo", "matrícula","como", "inscribirme", "matricularme", "ser", "parte", "empezar"]):
        reply = {
          messaging_product: "whatsapp",
          to: message.from,
          text: {
            body: `Para ser parte de nuestro centro de formación, te ofrecemos un programa con una beca 100% condonable. Para acceder a ella, lee atentamente las siguientes instrucciones y diligencia el formulario de inscripción. \nhttps://docs.google.com/forms/d/e/1FAIpQLSdbPRZDjYNlwZXJewMEtAWHOvYZPwlTPAEAKDeSI85aHg4F5Q/closedform`,
          },
          context: {
            message_id: message.id,
          },
        };
        break;
      // Respuesta para consultas sobre la ubicación
      case containsKeyword(keywords, ["ubicados", "ubicacion", "donde", "queda", "estan", "medellin", "lugar", "ciudad","donde", "locacion", "establecimiento"]):
        reply = {
          messaging_product: "whatsapp",
          to: message.from,
          text: {
            body: `Estamos ubicados en el Centro Comercial De Moda Outlet. Cl. 16 #55-129, Guayabal, Medellín. 3er piso.`,
          },
          context: {
            message_id: message.id,
          },
        };
        break;
      // Otras respuestas basadas en palabras clave...
    }

    // Envía la respuesta al usuario
    await sendMessage(businessPhoneNumberId, reply);
    // Marca el mensaje como leído
    await markAsRead(businessPhoneNumberId, message.id);
  }

  // Envía una respuesta de estado OK a la solicitud
  res.sendStatus(200);
});

// Maneja las solicitudes GET a la ruta /webhook
app.get("/webhook", (req, res) => {
  // Extrae los parámetros de consulta necesarios
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Verifica la validez del webhook
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // Responde con el desafío para verificar el webhook
    res.status(200).send(challenge);
    // Registra en la consola la verificación exitosa
    console.log("Webhook verified successfully!");
  } else {
    // Si la verificación falla, responde con un estado prohibido
    res.sendStatus(403);
  }
});

// Maneja las solicitudes GET a la ruta raíz "/"
app.get("/", (req, res) => {
  // Envía un mensaje simple como respuesta
  res.send(`<pre>Nothing to see here.
Checkout README.md to start.</pre>`);
});

// Inicia el servidor Express y lo
// miau miau