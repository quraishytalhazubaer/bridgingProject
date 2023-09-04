const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const dialogflow = require('@google-cloud/dialogflow')

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const PORT = 3001;
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./generpbot-demo.json"



// Handle user input and send it to Dialogflow
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/query', async (req, res) => {
  // const sessionId = req.body.sessionId
  const sessionId = uuid.v4();
  const projectId = 'generpbot-qoyc'

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
      }
      
      // Send request and log result
      const responses = await sessionClient.detectIntent(request)
      console.log(responses)
      const result = responses[0].queryResult
      const fulfillmentMessages = result.fulfillmentMessages;



      const textResponses = fulfillmentMessages
      .filter(message => message.message === 'text')
      .map(message => message.text.text[0]);

    const cardResponses = fulfillmentMessages
      .filter(message => message.card)
      .map(message => message.card);

    const mergedResponse = textResponses.join(' ') + cardResponses.map(card => `
      <div>
        <img width="200px" src="${card.imageUri}" alt="${card.title}"/>
        <h2>${card.title}</h2>
        <p>${card.subtitle}</p>
        <div>
          ${card.buttons.map(button => `<button onclick="window.open('${button.postback}')">${button.text}</button>`).join('')}
        </div>
      </div>
    `).join('');


    res.status(200).send(mergedResponse);


                  // let mergedResponse = ''; // Initialize an empty string to hold the merged response

                  // // Iterate through each message and extract text if available
                  // for (const message of result.fulfillmentMessages) {
                  //   if (message.text && message.text.text.length > 0) {
                  //     const messageText = message.text.text[0];
                  //     mergedResponse += messageText + ' '; // Concatenate the text with a space
                  //   }
                  // }

                  
                  // mergedResponse = mergedResponse.replace(/\n/g, '<br>');
                  // console.log(mergedResponse)
                  // res.status(200).json(mergedResponse.trim());
      
      // const botResponse = result.fulfillmentMessages[0].text.text[0]; // Extract the response text for fulfillmentMessages
      // res.status(200).json(botResponse);

      // Extract the response text for fulfillmentText
      // res.status(200).json(
      //      result.fulfillmentMessages
      //      //result.fulfillmentText
      // )

  } catch (error) {
      console.log(`Error: ${error}`)
      
      res.status(500).json({
          error: error
      })
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

