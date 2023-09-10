const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const uuid = require('uuid');
const dialogflow = require('@google-cloud/dialogflow');
const fs = require('fs');

process.env.GOOGLE_APPLICATION_CREDENTIALS = "./generpbot-demo.json";

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = 3001;

// Handle user input and send it to Dialogflow
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/query', async (req, res) => {
  const sessionId = uuid.v4();
  const projectId = 'generpbot-qoyc';

  try {
    const sessionClient = new dialogflow.SessionsClient();
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    // The text query request.
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          // The query to send to the dialogflow agent
          text: req.body.query,
          // The language used by the client (en-US)
          languageCode: 'en-US',
        },
      },
    };

    // Send request and log result
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    // Extract the action associated with the detected intent
    const model_name = result.action;
    console.log('Action:', model_name);

    // Send the action to the Django API
    const djangoApiUrl = 'http://localhost:8000/get_orm_object_by_action/' + model_name;
    const djangoApiResponse = await axios.get(djangoApiUrl);

    // Check the Django API response
    if (djangoApiResponse.data.result === 'success') {
      const ormObjectData = djangoApiResponse.data.data;
      
      const jsonString = JSON.stringify(ormObjectData, null, 2);
      const filePath = 'data.json';

      fs.writeFile(filePath, jsonString, 'utf8', (err) => {
        if (err) {
          console.error('Error writing JSON data to file:', err);
        } else {
          console.log('JSON data has been written to', filePath);
        }
      });
      // Use ormObjectData as needed
      console.log('ORM Object Data:', ormObjectData);

      // Send a response back to the client
      res.status(200).json({
        action: model_name,
        ormObjectData: ormObjectData,
      });
      
    } else {
      console.error('Error:', djangoApiResponse.data.message);
      res.status(500).json({
        error: 'Django API Error',
        message: djangoApiResponse.data.message,
      });
    }
  } catch (error) {
    console.log(`Error: ${error}`);

    res.status(500).json({
      error: error,
    });
  }
});

app.post('/bot', async (req, res) => {
  const userMessage = req.body.message; // when the user's message is sent in the 'message' field

  try {
    const sessionId = uuid.v4();
    const projectId = 'generpbot-qoyc';

    const sessionClient = new dialogflow.SessionsClient();
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userMessage,
          languageCode: 'en-US',
        },
      },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    const botResponse = result.fulfillmentText;
    res.json({ response: botResponse });

  } catch (error) {
    console.log(`Error: ${error}`);

    res.status(500).json({
      error: error.message,
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
